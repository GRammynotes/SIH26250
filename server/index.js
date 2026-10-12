@'
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'AIR COMMAND', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`[AIR COMMAND] Backend online on port ${PORT}`);
});
'@ | Out-File -Encoding utf8 server\index.js