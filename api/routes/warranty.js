const express = require("express")
const app = express.Router()
const fetch = require("node-fetch")
const Warranty = require("../models/Warranty")

require("dotenv")
const grendelRequest = require("../modules/grendel")
const { biosApi } = require("../modules/nodeApi")
const { warrantyApiReq } = require("../modules/Warranty")

app.get("/", (req, res) => {
  let routes = []
  app.stack.forEach((element) => {
    routes.push(element.route.path)
  })
  res.json({
    status: "success",
    currentRoute: "/warranty/",
    availibleRoutes: routes,
  })
})

app.get("/add/:tags", async (req, res) => {
  const tags = req.params.tags

  let result = await grendelRequest(`/v1/host/tags/${tags}`)
  if (result.grendelResponse === "success") {
    let arr = []
    for (const nodes of result.response) {
      if (
        nodes.name.substring(0, 3) === "cpn" ||
        nodes.name.substring(0, 3) === "srv"
      ) {
        let query = await Warranty.findOne({ nodeName: nodes.name }).exec()
        if (query === null) {
          let bmc = nodes.interfaces.find((element) => {
            if (element.bmc === true) return true
          })
          let biosRes = await biosApi(bmc.fqdn)
          if (biosRes.message === "success") {
            let st = biosRes.ServiceTag
            arr.push({
              nodeName: nodes.name,
              serviceTag: st,
              bmcFqdn: bmc.fqdn,
            })
          } else {
            console.error(biosRes)
          }
        }
      }
    }
    if (arr.length > 0) {
      let serviceTagString = ""
      if (arr.length > 1) {
        arr.forEach((element) => {
          serviceTagString += element.serviceTag + ","
        })
      } else {
        serviceTagString = arr[0].serviceTag
      }
      let warrantyRes = await warrantyApiReq(serviceTagString)

      if (warrantyRes.status === "success") {
        let data = []
        warrantyRes.result.forEach((val, index) => {
          if (val.invalid === false) {
            let arrData = arr.find((element) => {
              if (element.serviceTag === val.serviceTag) return true
            })
            data.push({
              nodeName: arrData.nodeName,
              bmcFqdn: arrData.bmcFqdn,
              serviceTag: val.serviceTag,
              shipDate: val.shipDate,
              productLineDescription: val.productLineDescription,
              entitlements: val.entitlements,
            })
          }
        })

        Warranty.collection.insertMany(data, function (err, warranty) {
          if (err)
            res.json({
              status: "failed",
              message: "An error occured while saving to the DB",
              color: "error",
              err,
            })
          else
            res.json({
              status: "success",
              message:
                warranty.insertedCount + " Nodes successfully added to the DB",
              color: "success",
              warranty: warranty,
            })
        })
      }
    } else {
      res.json({
        status: "failed",
        message: "No new nodes were added to the DB",
        color: "error",
      })
    }
  }
})

app.get("/get/:node", async (req, res) => {
  const node = req.params.node

  Warranty.findOne({ nodeName: node }, function (err, node) {
    if (err) {
      res.json({
        status: "failed",
        message: "An error occured while accessing the DB",
        color: "error",
        err,
      })
    } else {
      res.json({ status: "success", result: node })
    }
  })
})

module.exports = app
