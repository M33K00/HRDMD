const app = require("express")();
const PORT = process.env.PORT || 4000;

const bodyParser = require("express").json;
app.use(bodyParser());

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
