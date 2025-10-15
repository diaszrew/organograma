// feedz_desligar_colaboradores_corrigido_v2.js
const axios = require("axios");
const fs = require("fs");
const XLSX = require("xlsx");

const CONFIG = {
  TOKEN: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJwcm9maWxlX2lkIjoyMzM4ODg2LCJjb21wYW55X2lkIjo3NTIzLCJ0aW1lc3RhbXAiOjE3NTgyMTg0MjN9.Y4j6JrqS5x6Hn-QULfYkoG-FnaRVHJrKF8s8Y95OEjQ",
  BASE_URL: "https://app.feedz.com.br/v2/integracao/employees",
  PLANILHA: "colaboradores_desligamento.xlsx",
  DELAY_ENTRE_REQUISICOES: 1000
};

// ======== 1️⃣ Função para corrigir datas ========
function corrigirData(data) {
  if (!data) return new Date().toISOString().split('T')[0];
  
  // Se for string, tentar extrair a data
  if (typeof data === 'string') {
    // Remover horário se existir
    const dataParte = data.split(' ')[0];
    
    // Verificar se está no formato YYYY-MM-DD
    const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dataRegex.test(dataParte)) {
      return dataParte;
    }
    
    // Tentar converter de outros formatos
    try {
      const dataObj = new Date(data);
      if (!isNaN(dataObj.getTime())) {
        return dataObj.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn(`⚠️ Não foi possível converter a data: ${data}`);
    }
  }
  
  // Se for número (timestamp Excel)
  if (typeof data === 'number') {
    try {
      // Converter timestamp Excel para data JavaScript
      const dataObj = XLSX.SSF.parse_date_code(data);
      if (dataObj) {
        const ano = dataObj.y;
        const mes = String(dataObj.m).padStart(2, '0');
        const dia = String(dataObj.d).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
      }
    } catch (e) {
      console.warn(`⚠️ Não foi possível converter timestamp Excel: ${data}`);
    }
  }
  
  // Fallback: data atual
  console.warn(`⚠️ Usando data atual para data inválida: ${data}`);
  return new Date().toISOString().split('T')[0];
}

// ======== 2️⃣ Carregar e corrigir planilha ========
function carregarECorrigirPlanilha(caminhoArquivo) {
  if (!fs.existsSync(caminhoArquivo)) {
    throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);
  }

  const workbook = XLSX.readFile(caminhoArquivo);
  const primeiraAba = workbook.SheetNames[0];
  let dados = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba]);

  if (dados.length === 0) {
    throw new Error("A planilha está vazia!");
  }

  console.log(`📋 Carregados ${dados.length} registros da planilha`);

  // ======== CORREÇÕES AUTOMÁTICAS ========
  const dadosCorrigidos = [];
  const idsProcessados = new Set();
  const duplicatas = [];

  for (const [index, colab] of dados.entries()) {
    try {
      // 1. Corrigir ID (remover .0)
      let idCorrigido = colab.id;
      if (typeof colab.id === 'number') {
        idCorrigido = Math.floor(colab.id).toString();
      } else if (typeof colab.id === 'string') {
        idCorrigido = colab.id.replace('.0', '');
      }

      // 2. Corrigir data (formato YYYY-MM-DD)
      const dataCorrigida = corrigirData(colab.turnover_at);

      // 3. Verificar duplicatas
      if (idsProcessados.has(idCorrigido)) {
        console.warn(`⚠️ ID duplicado ignorado: ${idCorrigido} - ${colab.nome}`);
        duplicatas.push({ id: idCorrigido, nome: colab.nome, linha: index + 2 });
        continue;
      }
      idsProcessados.add(idCorrigido);

      dadosCorrigidos.push({
        ...colab,
        id: idCorrigido,
        turnover_at: dataCorrigida,
        // Garantir que type e reason tenham valores padrão
        type: colab.type || "Contrato Finalizado",
        reason: colab.reason || "Desligamento conforme planilha"
      });

    } catch (error) {
      console.error(`❌ Erro ao processar linha ${index + 2}:`, error.message);
    }
  }

  // Relatório de correções
  console.log(`🔧 Correções aplicadas:`);
  console.log(`   - Registros válidos: ${dadosCorrigidos.length}`);
  console.log(`   - Duplicatas removidas: ${duplicatas.length}`);

  // Mostrar amostra dos dados corrigidos
  console.log(`\n📝 Amostra dos primeiros 3 registros corrigidos:`);
  dadosCorrigidos.slice(0, 3).forEach((colab, i) => {
    console.log(`   ${i + 1}. ${colab.nome} - ID: ${colab.id} - Data: ${colab.turnover_at}`);
  });

  return dadosCorrigidos;
}

// ======== 3️⃣ Validar colaborador ========
function validarColaborador(colab, index) {
  const id = colab.id?.toString().trim();
  const nome = colab.nome?.trim() || `Colaborador ${index + 1}`;
  
  if (!id || id === '') {
    return { 
      valido: false, 
      erro: `Colaborador sem ID válido: ${nome}` 
    };
  }

  if (!colab.turnover_at) {
    return { 
      valido: false, 
      erro: `Colaborador ${nome} (${id}) sem data de desligamento` 
    };
  }

  // Validar formato da data (YYYY-MM-DD)
  const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dataRegex.test(colab.turnover_at)) {
    return { 
      valido: false, 
      erro: `Data inválida para ${nome} (${id}): ${colab.turnover_at}` 
    };
  }

  return { 
    valido: true, 
    id: id, 
    nome: nome 
  };
}

// ======== 4️⃣ Desligar colaborador ========
async function desligarColaborador(colab, index) {
  const validacao = validarColaborador(colab, index);
  
  if (!validacao.valido) {
    console.warn(`⚠️ ${validacao.erro}`);
    return { 
      nome: colab.nome || `Colaborador ${index + 1}`, 
      status: "erro", 
      motivo: validacao.erro 
    };
  }

  const { id, nome } = validacao;

  const payload = {
    type: colab.type,
    reason: colab.reason,
    turnover_at: colab.turnover_at,
  };

  // Log do payload para debug
  console.log(`📤 Enviando para ${nome} (${id}):`, JSON.stringify(payload));

  try {
    const url = `${CONFIG.BASE_URL}/${id}`;
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${CONFIG.TOKEN}`,
        "Content-Type": "application/json",
      },
      data: payload,
      timeout: 30000
    });

    console.log(`✅ ${nome} (${id}) desligado com sucesso - ${colab.turnover_at}`);
    return { 
      nome, 
      id, 
      status: "sucesso", 
      codigo: response.status,
      data: colab.turnover_at,
      type: colab.type,
      reason: colab.reason
    };
  } catch (err) {
    const statusCode = err.response?.status;
    const erro = err.response?.data || err.message;
    
    let mensagemErro = '';
    if (statusCode) {
      mensagemErro = `HTTP ${statusCode}`;
      if (err.response?.data) {
        mensagemErro += ` - ${JSON.stringify(err.response.data)}`;
      }
    } else {
      mensagemErro = err.message;
    }
    
    console.error(`❌ Erro ao desligar ${nome} (${id}):`, mensagemErro);
    
    return { 
      nome, 
      id, 
      status: "erro", 
      motivo: mensagemErro,
      codigo: statusCode || "N/A",
      data: colab.turnover_at,
      payload: payload // Incluir payload para debug
    };
  }
}

// ======== 5️⃣ Script principal ========
async function main() {
  console.log("🚀 Iniciando processo de desligamento...");
  console.log("=".repeat(50));

  try {
    // Carregar e corrigir dados
    const colaboradores = carregarECorrigirPlanilha(CONFIG.PLANILHA);

    if (colaboradores.length === 0) {
      console.log("❌ Nenhum colaborador válido para processar.");
      return;
    }

    // Processar colaboradores
    const resultados = [];
    for (let i = 0; i < colaboradores.length; i++) {
      console.log(`\n📝 Processando ${i + 1}/${colaboradores.length}...`);
      
      const resultado = await desligarColaborador(colaboradores[i], i);
      resultados.push(resultado);

      // Aguardar entre requisições
      if (i < colaboradores.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_ENTRE_REQUISICOES));
      }
    }

    // Gerar relatório
    gerarRelatorio(resultados);

  } catch (err) {
    console.error("❌ Erro crítico no processo:", err.message);
    process.exit(1);
  }
}

function gerarRelatorio(resultados) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const nomeArquivo = `relatorio_desligamentos_${timestamp}.json`;
  
  const relatorio = {
    timestamp: new Date().toISOString(),
    total_processados: resultados.length,
    sucessos: resultados.filter(r => r.status === "sucesso").length,
    erros: resultados.filter(r => r.status === "erro").length,
    resultados: resultados
  };

  fs.writeFileSync(nomeArquivo, JSON.stringify(relatorio, null, 2));
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 RESUMO FINAL");
  console.log("=".repeat(50));
  console.log(`📋 Total processado: ${relatorio.total_processados}`);
  console.log(`✅ Sucessos: ${relatorio.sucessos}`);
  console.log(`❌ Erros: ${relatorio.erros}`);
  console.log(`📈 Taxa de sucesso: ${((relatorio.sucessos / relatorio.total_processados) * 100).toFixed(1)}%`);
  console.log(`🧾 Relatório salvo em: ${nomeArquivo}`);

  // Mostrar primeiros erros se houver
  const erros = resultados.filter(r => r.status === "erro");
  if (erros.length > 0) {
    console.log(`\n⚠️  Primeiros 5 erros:`);
    erros.slice(0, 5).forEach(erro => {
      console.log(`   • ${erro.nome} (${erro.id}): ${erro.motivo}`);
    });
  }
}

// Executar
if (require.main === module) {
  main();
}
