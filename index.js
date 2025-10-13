// feedz_desligar_colaboradores_final.js
const axios = require("axios");
const fs = require("fs");
const XLSX = require("xlsx");

const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJwcm9maWxlX2lkIjoyMzM4ODg2LCJjb21wYW55X2lkIjo3NTIzLCJ0aW1lc3RhbXAiOjE3NTgyMTg0MjN9.Y4j6JrqS5x6Hn-QULfYkoG-FnaRVHJrKF8s8Y95OEjQ";
const BASE_URL = "https://app.feedz.com.br/v2/integracao/employees";
const PLANILHA = "colaboradores_desligamento.xlsx"; // Nome do arquivo da planilha

// ======== 1️⃣ Carregar planilha ========
function carregarPlanilha(caminhoArquivo) {
  if (!fs.existsSync(caminhoArquivo)) {
    throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);
  }

  const workbook = XLSX.readFile(caminhoArquivo);
  const primeiraAba = workbook.SheetNames[0];
  const dados = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba]);

  if (dados.length === 0) {
    throw new Error("A planilha está vazia!");
  }

  return dados;
}

// ======== 2️⃣ Desligar colaborador ========
async function desligarColaborador(colab) {
  const id = colab.id || colab.cpf?.replace(/\D/g, "");
  if (!id) {
    console.warn(`⚠️ Colaborador sem ID/CPF: ${colab.nome}`);
    return { nome: colab.nome || "Desconhecido", status: "erro", motivo: "sem ID" };
  }

  const payload = {
    type: colab.type || "Contrato Finalizado",
    reason: colab.reason || "Não especificado.",
    turnover_at:
      colab.turnover_at ||
      new Date().toISOString().split("T")[0], // Data atual YYYY-MM-DD
  };

  try {
    const url = `${BASE_URL}/${id}`;
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      data: payload,
    });

    console.log(`✅ ${colab.nome} (${id}) desligado com sucesso.`);
    return { nome: colab.nome, id, status: "sucesso", codigo: response.status };
  } catch (err) {
    const erro = err.response?.data || err.message;
    console.error(`❌ Erro ao desligar ${colab.nome} (${id}):`, erro);
    return { nome: colab.nome, id, status: "erro", motivo: JSON.stringify(erro) };
  }
}

// ======== 3️⃣ Script principal ========
async function main() {
  try {
    const colaboradores = carregarPlanilha(PLANILHA);

    console.log(`📋 Iniciando desligamento de ${colaboradores.length} colaboradores...`);

    const resultados = [];
    for (const colab of colaboradores) {
      const resultado = await desligarColaborador(colab);
      resultados.push(resultado);
    }

    fs.writeFileSync("log_desligamentos.json", JSON.stringify(resultados, null, 2));
    console.log("🧾 Log salvo em log_desligamentos.json");

    // ======== 4️⃣ Resumo final ========
    const sucesso = resultados.filter(r => r.status === "sucesso").length;
    const erro = resultados.filter(r => r.status === "erro").length;

    console.log(`\n📊 Resumo final:`);
    console.log(`✅ Sucesso: ${sucesso}`);
    console.log(`❌ Erros: ${erro}`);
  } catch (err) {
    console.error("❌ Erro no processo:", err.message);
  }
}

main();
