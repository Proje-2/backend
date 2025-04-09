const express = require('express');
const cors = require('cors');
const Tesseract = require('tesseract.js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/ocr', async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image data missing' });
  }

  try {
    const result = await Tesseract.recognize(
      image,
      'eng', // Turkish language
      { logger: m => console.log(m) }
    );
    res.json({ text: result.data.text });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'Failed to recognize text' });
  }
});

app.listen(3000, () => {
  console.log('OCR server running on http://localhost:3000');
});
