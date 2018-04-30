const express = require('express')
const app = express()
var mongo = require('mongodb').MongoClient
var request = require('request')


app.use(express.static('public'))


app.get("/", (request, response) => {
  response.sendFile(__dirname + '/views/index.html')
})

app.get("/api/search/:options", (req, res) => {
  // Looks for possible offset and returns the filtered search results as a JSON object
  var options = req.params.options
  var url = 'https://www.googleapis.com/customsearch/v1?&searchType=image&key=' + process.env.Google_Key + '&cx=' + process.env.Google_Cx + '&q=' + options
  if (Object.keys(req.query).length !== 0) { url += '&start=' + (Number(req.query.offset)+1)}
  
  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      var data = JSON.parse(body).items
      var arr = []
      for (var i=0; i<data.length; i++) {
        arr.push(
          {
            "url": data[i].link,
            "alt": data[i].title,
            "thumbnail": data[i].image.thumbnailLink,
            "context": data[i].image.contextLink
          }
        )
      }
      res.send(JSON.stringify(arr))
    } else if (error==null) res.send({"error": JSON.parse(body)})
    else res.send({"error": error})
  }
  
  // Update the query history
  var dbUrl = 'mongodb://' + process.env.DBadmin + ':' + process.env.DBpw + '@ds163689.mlab.com:63689/image-search-history'
  mongo.connect(dbUrl, function(err, client) {
    if (err) {
      console.log('There was an error connecting to the database.')
    } else {
      var db = client.db('image-search-history')
      var collection = db.collection('history')
      collection.find(
        {}
      ).toArray(function(err,docs) {
        if (err) {
          console.log('There was an error in the find function.')
          client.close()
        } else if (options != "favicon.ico") {
          var history = docs[0].queries
          console.log(history)
          var timestamp = new Date()
          if (history.length >= 10) { history.pop() }
          history.unshift({"query": options, "time": timestamp.toString()}) 
          collection.updateOne({},{$set: {"queries":history}})
          console.log(history)
          client.close
        }
      })
    }
  })
  
  request(url, callback)
})


app.get("/api/history/", (req, res) => {
  // Returns query history as a JSON object for the last 10 queries
  var url = 'mongodb://' + process.env.DBadmin + ':' + process.env.DBpw + '@ds163689.mlab.com:63689/image-search-history'
  mongo.connect(url, function(err, client) {
    if (err) {
      console.log('There was an error connecting to the database.')
      res.send('There was an error connecting to the database.')
    } else {
      var db = client.db('image-search-history')
      var collection = db.collection('history')
      collection.find(
        {}
      ).toArray(function(err,docs) {
        if (err) {
          console.log('There was an error in the find function.')
          res.send('There was an error in the find function.')
          client.close()
        } else {
          res.send(docs[0].queries)
          client.close
        }
      })
    }
  })
})


const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`)
})

