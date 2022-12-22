const express = require("express")
const app = express.Router()

let config = require("../config")

const { grendelRequest } = require("../modules/grendel")

app.get("/", (req, res) => {
  let routes = []
  app.stack.forEach((element) => {
    routes.push(element.route.path)
  })
  res.json({
    status: "success",
    currentRoute: "/grendel/",
    availableRoutes: routes,
  })
})
// --- hosts ---
app.get("/host/list", async (req, res) => {
  res.json(await grendelRequest("/v1/host/list"))
})
app.get("/host/find/:nodeset", async (req, res) => {
  const nodeset = req.params.nodeset
  res.json(await grendelRequest(`/v1/host/find/${nodeset}`))
})
app.get("/host/tags/:tags", async (req, res) => {
  const tags = req.params.tags
  res.json(await grendelRequest(`/v1/host/tags/${tags}`))
})

app.post("/host", async (req, res) => {
  // IP address check:
  if (typeof req.body === "object" && req.body.length > 0) {
    let tmp = req.body.map((val) => {
      return val.interfaces.every((iface) => iface.ip.match("[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}"))
    })
    if (tmp.every((val) => val)) res.json(await grendelRequest(`/v1/host`, "POST", req.body))
    else res.json({ status: "error", message: "Interface IP address is invalid or missing" })
  } else res.json({ status: "error", message: "Request body is not an Array" })
})

app.get("/delete/:nodeset", async (req, res) => {
  const nodeset = req.params.nodeset
  res.json(await grendelRequest(`/v1/host/find/${nodeset}`, "DELETE"))
})

app.get("/provision/:nodeset", async (req, res) => {
  const nodeset = req.params.nodeset
  res.json(await grendelRequest(`/v1/host/provision/${nodeset}`, "PUT"))
})
app.get("/unprovision/:nodeset", async (req, res) => {
  const nodeset = req.params.nodeset
  res.json(await grendelRequest(`/v1/host/unprovision/${nodeset}`, "PUT"))
})
app.get("/tag/:nodeset/:tags", async (req, res) => {
  const nodeset = req.params.nodeset
  const tags = req.params.tags
  res.json(await grendelRequest(`/v1/host/tag/${nodeset}?tags=${tags}`, "PUT"))
})
app.get("/untag/:nodeset/:tags", async (req, res) => {
  const nodeset = req.params.nodeset
  const tags = req.params.tags
  res.json(await grendelRequest(`/v1/host/untag/${nodeset}?tags=${tags}`, "PUT"))
})

// --- images ---
app.get("/image/list", async (req, res) => {
  res.json(await grendelRequest(`/v1/bootimage/list`))
})
app.get("/image/find/:nodeset", async (req, res) => {
  const nodeset = req.params.nodeset
  res.json(await grendelRequest(`/v1/bootimage/find/${nodeset}`))
})
app.post("/image", async (req, res) => {
  res.json(await grendelRequest(`/v1/bootimage`, "POST", req.body))
})
app.delete("/image/delete/:nodeset", async (req, res) => {
  const nodeset = req.params.nodeset
  res.json(await grendelRequest(`/v1/bootimage/find/${nodeset}`, "DELETE"))
})

app.get("/firmware/list", async (req, res) => {
  res.json({
    status: "success",
    result: config.firmware,
  })
})

// app.get("/status/:value/:tags?", async (req, res) => {
//   let tags = req.params.tags === undefined ? "" : req.params.tags
//   let args = ["status"]

//   if (req.params.value === "nodes") args.push("nodes", `${tags}`)
//   else if (req.params.value === "long") args.push("nodes", `${tags}`, "--long")
//   else args.push(`${tags}`)

//   const status = spawn("grendel", args)
//   let stdout = "",
//     stderr = "",
//     error = ""

//   status.stdout.on("data", (data) => {
//     stdout += data
//   })
//   status.stderr.on("data", (data) => {
//     stderr += data
//   })
//   status.on("error", (err) => {
//     error = err
//     res.json({
//       status: "error",
//       message: err,
//     })
//   })
//   status.on("close", (code) => {
//     if (stderr === "" && error === "") {
//       res.json({
//         status: "success",
//         result: stdout,
//       })
//     } else {
//       res.json({
//         status: "error",
//         message: `Issue fetching grendel status: ${stderr}`,
//       })
//     }
//   })
// })

app.post("/edit", async (req, res) => {
  const nodeset = req.body.nodeset
  const action = req.body.action
  const actionIndex = req.body.action_index
  const value = req.body.value

  let originalJSON = await grendelRequest(`/v1/host/find/${nodeset}`)

  if (originalJSON.status !== "error") {
    let updatedJSON = originalJSON.result.map((val) => {
      if (action === "firmware") val.firmware = value
      else if (action === "image") val.boot_image = value
      else if (action === "interfaces" && actionIndex === undefined) val.interfaces = value
      else if (action === "interfaces" && val.interfaces[actionIndex] !== undefined) val.interfaces[actionIndex] = value
      else if (action === "interfaces" && val.interfaces[actionIndex] === undefined) val.interfaces.push(value)
      return val
    })

    let updateNode = await grendelRequest(`/v1/host`, "POST", updatedJSON)
    res.json(updateNode)
  } else {
    res.json({
      status: "error",
      message: originalJSON.result.message,
    })
  }
})

module.exports = app
