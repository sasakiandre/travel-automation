module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Travel Automation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 500px; width: 100%; text-align: center; }
    h1 { color: #333; margin-bottom: 20px; font-size: 28px; }
    .description { color: #666; margin-bottom: 30px; font-size: 16px; line-height: 1.6; }
    button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 15px 40px; font-size: 18px; border-radius: 10px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; font-weight: 600; width: 100%; }
    button:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4); }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .status { margin-top: 20px; padding: 15px; border-radius: 10px; font-weight: 500; display: none; }
    .status.loading { background: #e3f2fd; color: #1976d2; display: block; }
    .status.success { background: #e8f5e9; color: #388e3c; display: block; }
    .status.error { background: #ffebee; color: #d32f2f; display: block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✈️ Travel Automation</h1>
    <p class="description">Clique para processar emails de passagens e criar eventos no calendário.</p>
    <button id="processBtn" onclick="processNow()">🚀 Processar Agora</button>
    <div id="status" class="status"></div>
  </div>
  <script>
    async function processNow() {
      const btn = document.getElementById('processBtn');
      const status = document.getElementById('status');
      btn.disabled = true;
      status.className = 'status loading';
      status.innerHTML = '⏳ Processando... pode levar alguns minutos.';
      try {
        const response = await fetch('/api/process', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
          status.className = 'status success';
          status.innerHTML = '✅ ' + data.message;
        } else {
          status.className = 'status error';
          status.innerHTML = '❌ Erro: ' + data.error;
        }
      } catch (error) {
        status.className = 'status error';
        status.innerHTML = '❌ Erro: ' + error.message;
      } finally {
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>
  `);
};
