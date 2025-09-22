const admin = require("firebase-admin");
const fs = require("fs");

// 1. Inicializa o Firebase Admin com a chave do serviço
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 2. Carrega o arquivo colaboradores.json
const colaboradores = JSON.parse(fs.readFileSync("colaboradores.json", "utf8"));

async function subirParaFirebase() {
  const batch = db.batch();

  colaboradores.forEach((colaborador) => {
    // cria documento com id automático
    const ref = db.collection("colaboradores").doc();
    batch.set(ref, colaborador);
  });

  await batch.commit();
  console.log(`✅ ${colaboradores.length} colaboradores enviados ao Firebase`);
}

subirParaFirebase().catch(console.error);
