// Estado global compartilhado entre módulos
const state = {
  historicoGlobal: [],
  horariosGlobal: [],
  ultimaBusca: null,
  ultimaDataFonteISO: null,
  fonteAtrasada: false,
  fonteAtrasoMinutos: null
};

module.exports = state;
