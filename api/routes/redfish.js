const express = require("express")
const app = express.Router()
const Nodes = require("../models/Nodes")

// TODO: Deprecate
const { getBMC } = require("../modules/grendel")
const { timeComp, redfishMapping } = require("../modules/cache")
const { redfish_auth, redfish_logout } = require("../modules/redfish/auth")
const { dell_systems, sm_systems, hpe_systems } = require("../modules/redfish/systems")
const { dell_managers, sm_managers, hpe_managers } = require("../modules/redfish/managers")
const { dell_sel, sm_sel, hpe_sel } = require("../modules/redfish/sel")
const { dell_gpu, sm_gpu, hpe_gpu } = require("../modules/redfish/gpu")
const { dell_storage, sm_storage, hpe_storage } = require("../modules/redfish/storage")
const { dell_clearSel, sm_clearSel, hpe_clearSel } = require("../modules/redfish/clearSel")
const { dell_resetBmc, sm_resetBmc, hpe_resetBmc } = require("../modules/redfish/resetBmc")
const { dell_resetNode, sm_resetNode, hpe_resetNode } = require("../modules/redfish/resetNode")

app.get("/", (req, res) => {
  let routes = []
  app.stack.forEach((element) => {
    routes.push(element.route.path)
  })
  res.json({
    status: "success",
    currentRoute: "/redfish/",
    availibleRoutes: routes,
  })
})

app.get("/v1/all/:node/:refetch?", async (req, res) => {
  const node = req.params.node
  const refetch = req.params.refetch

  let bmc = await getBMC(node)
  if (bmc.status === "success") {
    const uri = `https://${bmc.address}`
    let auth = await redfish_auth(uri)
    if (auth.status === "success") {
      let api_res = new String()

      if (auth.oem === "Dell") {
        let cache_res = await Nodes.findOne({ node: node })
        if (cache_res !== null && refetch !== "true" && !timeComp(cache_res.updatedAt)) {
          api_res = cache_res
        } else {
          api_res = await Promise.all([
            await dell_systems(uri, auth.token),
            await dell_managers(uri, auth.token),
            await dell_gpu(uri, auth.token, auth.version),
            await dell_storage(uri, auth.token, auth.version),
            await dell_sel(uri, auth.token, auth.version),
          ])
          let redfish = redfishMapping(api_res, "toDB")
          let update_res = await Nodes.findOneAndUpdate(
            { node: node },
            { redfish: redfish },
            { new: true, upsert: true }
          )
        }
      } else if (auth.oem === "Supermicro") {
        api_res = await Promise.all([
          await sm_systems(uri, auth.token),
          await sm_managers(uri, auth.token),
          await sm_gpu(uri, auth.token),
          await sm_storage(uri, auth.token),
          await sm_sel(uri, auth.token),
        ])
      } else if (auth.oem === "HPE") {
        api_res = await Promise.all([
          await hpe_systems(uri, auth.token),
          await hpe_managers(uri, auth.token),
          await hpe_gpu(uri, auth.token),
          await hpe_storage(uri, auth.token),
          await hpe_sel(uri, auth.token),
        ])
      } else
        api_res = {
          status: "error",
          message: "failed to parse OEM from Redfish call",
        }

      let logout_res = await redfish_logout(auth.location, uri, auth.token)
      if (logout_res.status !== 200) console.error(`Failed to logout of ${node}'s bmc`, await logout_res.json())
      res.json(api_res)
    } else res.json(auth)
  } else res.json(bmc)
})

app.get("/v1/systems/:node", async (req, res) => {
  const node = req.params.node
  let bmc = await getBMC(node)
  if (bmc.status === "success") {
    const uri = `https://${bmc.address}`
    let auth = await redfish_auth(uri)
    if (auth.status === "success") {
      let api_res = new String()

      if (auth.oem === "Dell") api_res = await dell_systems(uri, auth.token)
      else if (auth.oem === "Supermicro") api_res = await sm_systems(uri, auth.token)
      else if (auth.oem === "HPE") api_res = await hpe_systems(uri, auth.token)
      else
        api_res = {
          status: "error",
          message: "failed to parse OEM from Redfish call",
        }

      await redfish_logout(auth.location, uri, auth.token)
      res.json(api_res)
    } else res.json(auth)
  } else res.json(bmc)
})

app.get("/v1/managers/:node", async (req, res) => {
  const node = req.params.node
  let bmc = await getBMC(node)
  if (bmc.status === "success") {
    const uri = `https://${bmc.address}`
    let auth = await redfish_auth(uri)
    if (auth.status === "success") {
      let api_res = new String()

      if (auth.oem === "Dell") api_res = await dell_managers(uri, auth.token)
      else if (auth.oem === "Supermicro") api_res = await sm_managers(uri, auth.token)
      else if (auth.oem === "HPE") api_res = await hpe_managers(uri, auth.token)
      else
        api_res = {
          status: "error",
          message: "failed to parse OEM from Redfish call",
        }

      await redfish_logout(auth.location, uri, auth.token)
      res.json(api_res)
    } else res.json(auth)
  } else res.json(bmc)
})

app.get("/v1/gpu/:node", async (req, res) => {
  const node = req.params.node
  let bmc = await getBMC(node)
  if (bmc.status === "success") {
    const uri = `https://${bmc.address}`
    let auth = await redfish_auth(uri)
    if (auth.status === "success") {
      let api_res = new String()

      if (auth.oem === "Dell") api_res = await dell_gpu(uri, auth.token, auth.version)
      else if (auth.oem === "Supermicro") api_res = await sm_gpu(uri, auth.token)
      else if (auth.oem === "HPE") api_res = await hpe_gpu(uri, auth.token)
      else
        api_res = {
          status: "error",
          message: "failed to parse OEM from Redfish call",
        }

      await redfish_logout(auth.location, uri, auth.token)
      res.json(api_res)
    } else res.json(auth)
  } else res.json(bmc)
})

app.get("/v1/storage/:node", async (req, res) => {
  const node = req.params.node
  let bmc = await getBMC(node)
  if (bmc.status === "success") {
    const uri = `https://${bmc.address}`
    let auth = await redfish_auth(uri)
    if (auth.status === "success") {
      let api_res = new String()

      if (auth.oem === "Dell") api_res = await dell_storage(uri, auth.token, auth.version)
      else if (auth.oem === "Supermicro") api_res = await sm_storage(uri, auth.token)
      else if (auth.oem === "HPE") api_res = await hpe_storage(uri, auth.token)
      else
        api_res = {
          status: "error",
          message: "failed to parse OEM from Redfish call",
        }

      await redfish_logout(auth.location, uri, auth.token)
      res.json(api_res)
    } else res.json(auth)
  } else res.json(bmc)
})

app.get("/v1/sel/:node", async (req, res) => {
  const node = req.params.node

  let bmc = await getBMC(node)
  if (bmc.status === "success") {
    const uri = `https://${bmc.address}`
    let auth = await redfish_auth(uri)
    if (auth.status === "success") {
      if (auth.oem === "Dell") api_res = await dell_sel(uri, auth.token, auth.version)
      else if (auth.oem === "Supermicro") api_res = await sm_sel(uri, auth.token)
      else if (auth.oem === "HPE") api_res = await hpe_sel(uri, auth.token)
      else
        api_res = {
          status: "error",
          message: "failed to parse OEM from Redfish call",
        }

      await redfish_logout(auth.location, uri, auth.token)
      res.json(api_res)
    } else res.json(auth)
  } else res.json(bmc)
})

app.put("/v1/clearSel/:node", async (req, res) => {
  const node = req.params.node

  let bmc = await getBMC(node)
  if (bmc.status === "success") {
    const uri = `https://${bmc.address}`
    let auth = await redfish_auth(uri)
    if (auth.status === "success") {
      if (auth.oem === "Dell") api_res = await dell_clearSel(uri, auth.token)
      else if (auth.oem === "Supermicro") api_res = await sm_clearSel(uri, auth.token)
      else if (auth.oem === "HPE") api_res = await hpe_clearSel(uri, auth.token)
      else
        api_res = {
          status: "error",
          message: "failed to parse OEM from Redfish call",
        }

      await redfish_logout(auth.location, uri, auth.token)
      res.json(api_res)
    } else res.json(auth)
  } else res.json(bmc)
})

app.put("/v1/resetBmc/:node", async (req, res) => {
  const node = req.params.node

  let bmc = await getBMC(node)
  if (bmc.status === "success") {
    const uri = `https://${bmc.address}`
    let auth = await redfish_auth(uri)
    if (auth.status === "success") {
      if (auth.oem === "Dell") api_res = await dell_resetBmc(uri, auth.token)
      else if (auth.oem === "Supermicro") api_res = await sm_resetBmc(uri, auth.token)
      else if (auth.oem === "HPE") api_res = await hpe_resetBmc(uri, auth.token)
      else
        api_res = {
          status: "error",
          message: "failed to parse OEM from Redfish call",
        }

      await redfish_logout(auth.location, uri, auth.token)
      res.json(api_res)
    } else res.json(auth)
  } else res.json(bmc)
})

app.put("/v1/resetNode/:node", async (req, res) => {
  const node = req.params.node

  let bmc = await getBMC(node)
  if (bmc.status === "success") {
    const uri = `https://${bmc.address}`
    let auth = await redfish_auth(uri)
    if (auth.status === "success") {
      if (auth.oem === "Dell") api_res = await dell_resetNode(uri, auth.token)
      else if (auth.oem === "Supermicro") api_res = await sm_resetNode(uri, auth.token)
      else if (auth.oem === "HPE") api_res = await hpe_resetNode(uri, auth.token)
      else
        api_res = {
          status: "error",
          message: "failed to parse OEM from Redfish call",
        }

      await redfish_logout(auth.location, uri, auth.token)
      res.json(api_res)
    } else res.json(auth)
  } else res.json(bmc)
})

module.exports = app
