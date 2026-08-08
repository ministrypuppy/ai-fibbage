const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Move browser-only audio logic to your frontend client script instead of running it here in Node.js.

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});