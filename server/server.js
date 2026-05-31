const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

const datosIniciales = {
  faseA: {
    voltaje: 0,
    corriente: 0,
    potenciaActiva: 0,
    potenciaReactiva: 0,
    factorPotencia: 0,
  },
  faseB: {
    voltaje: 0,
    corriente: 0,
    potenciaActiva: 0,
    potenciaReactiva: 0,
    factorPotencia: 0,
  },
  faseC: {
    voltaje: 0,
    corriente: 0,
    potenciaActiva: 0,
    potenciaReactiva: 0,
    factorPotencia: 0,
  },
  totales: {
    potenciaActivaTotal: 0,
    potenciaReactivaTotal: 0,
    potenciaAparenteTotal: 0,
    factorPotenciaTotal: 0,
  },
  frecuencia: 0,
  receivedAt: null,
  receivedAtLocal: null,
};

let datosElectricos = datosIniciales;
let clientes = [];

const carpetaData = path.join(__dirname, "data");
const archivoCSV = path.join(carpetaData, "mediciones.csv");

function asegurarArchivoCSV() {
  if (!fs.existsSync(carpetaData)) {
    fs.mkdirSync(carpetaData, { recursive: true });
  }

  if (!fs.existsSync(archivoCSV)) {
    const encabezados = [
      "receivedAt",
      "receivedAtLocal",
      "faseA_voltaje",
      "faseA_corriente",
      "faseA_potenciaActiva",
      "faseA_potenciaReactiva",
      "faseA_factorPotencia",
      "faseB_voltaje",
      "faseB_corriente",
      "faseB_potenciaActiva",
      "faseB_potenciaReactiva",
      "faseB_factorPotencia",
      "faseC_voltaje",
      "faseC_corriente",
      "faseC_potenciaActiva",
      "faseC_potenciaReactiva",
      "faseC_factorPotencia",
      "potenciaActivaTotal",
      "potenciaReactivaTotal",
      "potenciaAparenteTotal",
      "factorPotenciaTotal",
      "frecuencia",
    ].join(",");

    fs.writeFileSync(archivoCSV, encabezados + "\n", "utf8");
  }
}

function valorCSV(valor) {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor).replace(/"/g, '""');
  return `"${texto}"`;
}

function obtenerHoraRecepcion() {
  const ahora = new Date();

  return {
    receivedAt: ahora.toISOString(),
    receivedAtLocal: ahora.toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  };
}

function guardarDatoCSV(datos) {
  asegurarArchivoCSV();

  const fila = [
    datos.receivedAt,
    datos.receivedAtLocal,

    datos.faseA?.voltaje,
    datos.faseA?.corriente,
    datos.faseA?.potenciaActiva,
    datos.faseA?.potenciaReactiva,
    datos.faseA?.factorPotencia,

    datos.faseB?.voltaje,
    datos.faseB?.corriente,
    datos.faseB?.potenciaActiva,
    datos.faseB?.potenciaReactiva,
    datos.faseB?.factorPotencia,

    datos.faseC?.voltaje,
    datos.faseC?.corriente,
    datos.faseC?.potenciaActiva,
    datos.faseC?.potenciaReactiva,
    datos.faseC?.factorPotencia,

    datos.totales?.potenciaActivaTotal,
    datos.totales?.potenciaReactivaTotal,
    datos.totales?.potenciaAparenteTotal,
    datos.totales?.factorPotenciaTotal,

    datos.frecuencia,
  ]
    .map(valorCSV)
    .join(",");

  fs.appendFileSync(archivoCSV, fila + "\n", "utf8");
}

function enviarEventoAClientes(datos) {
  clientes.forEach((cliente) => {
    cliente.write(`data: ${JSON.stringify(datos)}\n\n`);
  });
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    mensaje: "Servidor activo",
  });
});

app.get("/datos", (req, res) => {
  res.json(datosElectricos);
});

app.get("/eventos", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.flushHeaders();

  clientes.push(res);

  req.on("close", () => {
    clientes = clientes.filter((cliente) => cliente !== res);
  });
});

app.post("/datos", (req, res) => {
  const horaRecepcion = obtenerHoraRecepcion();

  datosElectricos = {
    ...req.body,
    ...horaRecepcion,
  };

  console.log("Datos recibidos:", datosElectricos);

  enviarEventoAClientes(datosElectricos);
  guardarDatoCSV(datosElectricos);

  res.json({
    ok: true,
    mensaje: "Datos recibidos correctamente",
    archivoCSV,
    ...horaRecepcion,
  });
});

app.post("/reset", (req, res) => {
  datosElectricos = datosIniciales;
  enviarEventoAClientes(datosElectricos);

  res.json({
    ok: true,
    mensaje: "Datos reiniciados",
  });
});

asegurarArchivoCSV();

const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor activo en puerto ${PORT}`);
  console.log("CSV guardándose en:", archivoCSV);
});