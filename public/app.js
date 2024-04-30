const path = require('path')

const express = require('express')
const app = express()
const port = 8080

let clientDir = path.join(__dirname, 'client')
let staticDir = path.join(clientDir,'public')


app.use(express.static(staticDir))

//app root
app.get('/', rootHandler)

function rootHandler(request, response) {
  //Need to add an error check!
  response.sendFile(path.join(staticDir, "todo.html"), (err) => {
      if (err) {
          console.error("Error sending file", err);
          response.status(err.status || 500).send("Error sending file");
      }
  });
}

app.listen(port, () => {
  console.log(`Simple static TODO server running on port ${port}`)
})

