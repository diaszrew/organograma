const axios = require("axios");
const fs = require("fs");

const TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJwcm9maWxlX2lkIjoyMzM4ODg2LCJjb21wYW55X2lkIjo3NTIzLCJ0aW1lc3RhbXAiOjE3NTgyMTg0MjN9.Y4j6JrqS5x6Hn-QULfYkoG-FnaRVHJrKF8s8Y95OEjQ"; // substitua pela sua chave real

async function listarColaboradoresFeedz() {
  try {
    const url = "https://app.feedz.com.br/v2/integracao/employees";

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      params: {
        status: "Ativo",
      },
    });

    console.log("=== RESPOSTA BRUTA DA API ===");
    console.log(
      JSON.stringify(response.data, null, 2).slice(0, 1000) + "\n...(cortado)..."
    );
    console.log("=== FIM ===");

    // --- Detecta automaticamente onde está o array ---
    let colaboradores;
    if (Array.isArray(response.data)) {
      colaboradores = response.data;
    } else if (Array.isArray(response.data.data)) {
      colaboradores = response.data.data;
    } else {
      const firstArrayKey = Object.keys(response.data).find((k) =>
        Array.isArray(response.data[k])
      );
      if (firstArrayKey) {
        colaboradores = response.data[firstArrayKey];
      } else {
        throw new Error(
          "Não encontrei array no retorno da API: " +
            JSON.stringify(Object.keys(response.data))
        );
      }
    }

    // --- Mapeia os dados ---
    const dados = colaboradores.map((c) => ({
      id: c.id || c.employeeId || null,
      nome: c.name || c.full_name, // prioriza 'name'
      email: c.email || null,
      cpf:
        c.cpf?.replace(/\D/g, "") ||
        (c.document?.replace(/\D/g, "") || null),
      cargo: c.description || c.job_title || c.job_description?.title || null, // <-- Alterado aqui
      departamento:
        (typeof c.department === "string" && c.department) ||
        c.department_data?.name ||
        null,
      gestorDireto: c.direct_manager?.name || c.manager || null,
    }));

    fs.writeFileSync(
      "colaboradores.json",
      JSON.stringify(dados, null, 2),
      "utf-8"
    );

    console.log(
      `✅ ${dados.length} colaboradores salvos em colaboradores.json`
    );
  } catch (err) {
    console.error(
      "❌ Erro ao buscar colaboradores:",
      err.response?.status,
      err.response?.data || err.message
    );
  }
}

listarColaboradoresFeedz();
