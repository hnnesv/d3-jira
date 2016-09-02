'use strict'
const stdio = require('stdio')
const request = require('request')
const moment = require('moment')
const express = require('express')
const cors = require('cors')
const _ = require('lodash')

let buildJQL = (f, t) => {
  let dCheck = (d, f, t) => `(${d} >= '${f.format('YYYY-MM-DD')}' AND ${d} <= '${t.format('YYYY-MM-DD')}')`
  return {
    jql: `${dCheck('worklogDate', f, t)}`,
    startAt: 0,
    maxResults: 1000,
    fields: [
      'status'
    ]
  }
}

let queryIssues = (ops, callback) => {
  const jql = buildJQL(moment().subtract(1, 'month'), moment())

  request.post({
    url: `https://${ops.host}/rest/api/2/search`,
    auth: {
      user: ops.user,
      pass: ops.pass
    },
    body: jql,
    json: true
  }, (err, res, body) => {
    if (err || res.statusCode !== 200) {
      console.error(`Received status ${res.statusCode} from JIRA`)
      console.error(err)
      console.error(body)
      return callback(err)
    }

    callback(null, {
      projects: _.uniq(body.issues.map((i) => i.key.split('-')[0])).reverse(),
      issues: (body.issues.map((i) => {
        return {
          key: i.key,
          project: i.key.split('-')[0],
          status: i.fields.status.name
        }
      })).reverse()
    })
  })
}

(() => {
  let ops = stdio.getopt({
    host: {
      key: 'h',
      args: 1,
      description: 'JIRA Host',
      mandatory: true
    },
    user: {
      key: 'u',
      args: 1,
      description: 'JIRA API User',
      mandatory: true
    },
    pass: {
      key: 'p',
      args: 1,
      description: 'JIRA API Password',
      mandatory: true
    }
  })

  let app = express()
  app.use(cors())

  app.get('/', (req, res) => {
    queryIssues(ops, (err, results) => {
      if (err) {
        res.sendStatus(500)
      } else {
        res.statusCode = 200
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(results))
      }
    });
  })

  app.listen(9006, () => {
    console.log('Up and running on port 9006');
  })
})()
