import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
} from "@mui/material"
import React, { useContext, useState } from "react"

import { UserContext } from "../../contexts/UserContext"
import { apiConfig } from "../../config"
import { useQuery } from "react-query"
import { useSnackbar } from "notistack"

const RackActions = ({ nodes }) => {
  const { enqueueSnackbar } = useSnackbar()
  const [user] = useContext(UserContext)
  const [action, setAction] = useState("")
  const [data, setData] = useState("")
  const [tags, setTags] = useState({ tags: "", action: "tag" })
  const [provision, setProvision] = useState("provision")
  const [image, setImage] = useState("")
  const [pxe, setPxe] = useState(false)
  const [open, setOpen] = useState(false)
  const [nodeAction, setNodeAction] = useState("")

  const query = useQuery(
    ["rackActionsQuery", nodes, action, data],
    async ({ signal }) => {
      let url = apiConfig.apiUrl + "/grendel"
      let payload = {
        headers: {
          "x-access-token": user.accessToken,
          "Content-Type": "application/json",
        },
        signal,
      }
      if (action === "image") {
        payload.body = JSON.stringify({ nodeset: nodes, action: "image", value: data })
        payload.method = "POST"
        url += "/edit"
      } else url += `/${action}/${nodes}${data}`

      const res = await (await fetch(url, payload)).json()
      if (res.status === "error") enqueueSnackbar(res.message, { variant: res.status })
      else
        enqueueSnackbar(
          `Successfully changed "${action.replace(/^un/, "")}" attribute on ${res.result.hosts} host(s)`,
          {
            variant: res.status,
          }
        )
      return res
    },
    { enabled: false }
  )
  const redfish_query = useQuery(
    ["rackActionsRedfishQuery", nodes, nodeAction, pxe],
    async ({ signal }) => {
      let url = `${apiConfig.apiUrl}/redfish/v1/${nodeAction}/${nodes}`
      if (nodeAction === "resetNode") url += `/${pxe}`
      let payload = {
        method: "PUT",
        headers: {
          "x-access-token": user.accessToken,
        },
        signal,
      }

      const res = await (await fetch(url, payload)).json()
      enqueueSnackbar(res.message, { variant: res.status })
      if (res.status === "error") console.error("redfish_query errors:", res.error)
      return res
    },
    { enabled: false }
  )

  const image_query = useQuery("rackActionsImage", async ({ signal }) => {
    let payload = {
      headers: {
        "x-access-token": user.accessToken,
      },
      signal,
    }
    const res = await (await fetch(`${apiConfig.apiUrl}/grendel/image/list`, payload)).json()
    if (res.status === "error") enqueueSnackbar(res.message, { variant: "error" })
    return res
  })
  const handleSubmit = async (action, data) => {
    if (action === "tags") {
      setAction(data.action)
      setData("/" + data.tags.replace(/\s/g, ""))
    } else if (action === "provision") {
      setAction(data)
      setData("")
    } else {
      setAction(action)
      setData(data)
    }
    await new Promise((resolve) => setTimeout(resolve, 50)) // timeout to fix weird query behavior
    query.refetch()
  }
  const handleNodeAction = async (action) => {
    setNodeAction(action)
    await new Promise((resolve) => setTimeout(resolve, 50)) // timeout to fix weird query behavior
    redfish_query.refetch()
    setOpen(false)
  }
  return (
    <>
      <Box sx={{ padding: "5px" }}>
        <Grid container spacing={2}>
          <Grid item xs={5}>
            <TextField
              onChange={(event) => setTags({ ...tags, tags: event.target.value })}
              variant="outlined"
              size="small"
              label="Tags"
              placeholder="z01, gpu, 2u"
            />
          </Grid>
          <Grid item xs={5}>
            <RadioGroup defaultValue={"tag"} row onChange={(event) => setTags({ ...tags, action: event.target.value })}>
              <FormControlLabel value="tag" control={<Radio size="small" />} label="Add" />
              <FormControlLabel value="untag" control={<Radio size="small" />} label="Remove" />
            </RadioGroup>
          </Grid>
          <Grid item xs={2}>
            <Button onClick={() => handleSubmit("tags", tags)} variant="outlined">
              Submit
            </Button>
          </Grid>
          <Grid item xs={10}>
            <RadioGroup defaultValue={"provision"} row onChange={(event) => setProvision(event.target.value)}>
              <FormControlLabel value="provision" control={<Radio size="small" />} label="Provision" />
              <FormControlLabel value="unprovision" control={<Radio size="small" />} label="Unprovision" />
            </RadioGroup>
          </Grid>
          <Grid item xs={2}>
            <Button onClick={() => handleSubmit("provision", provision)} variant="outlined">
              Submit
            </Button>
          </Grid>
          <Grid item xs={10}>
            {image_query.isFetched && image_query.data.status === "success" && (
              <Select value={image} onChange={(event) => setImage(event.target.value)} variant="outlined" size="small">
                {image_query.data.result.map((val, index) => {
                  return (
                    <MenuItem value={val.name} key={index}>
                      {val.name}
                    </MenuItem>
                  )
                })}
              </Select>
            )}
          </Grid>
          <Grid item xs={2}>
            <Button onClick={() => handleSubmit("image", image)} variant="outlined">
              Submit
            </Button>
          </Grid>
          <Grid item xs={12} sx={{ display: "flex", gap: "5px" }}>
            <Button variant="outlined" onClick={() => handleNodeAction("clearSel")}>
              Clear SELs
            </Button>
            <Button variant="outlined" onClick={() => handleNodeAction("resetBmc")}>
              Reset BMCs
            </Button>
            <Button variant="outlined" color="warning" onClick={() => setOpen(true)}>
              Reboot Nodes
            </Button>
          </Grid>
        </Grid>
      </Box>
      <Dialog open={open}>
        <DialogTitle>Please confirm selection:</DialogTitle>
        <DialogContent>{nodes}</DialogContent>
        <DialogActions>
          <FormControlLabel
            control={<Checkbox value={pxe} onClick={(event) => setPxe(!event.target.value)} />}
            label="PXE boot"
            sx={{ marginLeft: "5px" }}
          />
          <Button variant="outlined" color="error" onClick={() => handleNodeAction("resetNode")}>
            Power cycle
          </Button>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default RackActions