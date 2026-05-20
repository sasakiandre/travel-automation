const { execSync } = require('child_process');

module.exports = async (req, res) => {
  try {
    console.log('🚀 Iniciando processamento manual via API...');
    
    const result = execSync('node src/index.js', {
      cwd: process.env.PWD,
      timeout: 300000,
      encoding: 'utf-8'
    });

    res.status(200).json({
      success: true,
      message: 'Processamento iniciado com sucesso!',
      output: result
    });
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
