const { api_request } = require("./redfish")

async function dell_gpu(uri, token, version) {
  let versionArr = version.split(".")
  if (versionArr[0] > 1 || versionArr[1] > 4) {
    // Redfish version higher than 1.4
    let tmp_url = uri + "/redfish/v1/Systems/System.Embedded.1/Processors"
    let tmp_res = await api_request(tmp_url, token)
    if (tmp_res.status === "success") {
      let all_gpus = new Array()
      let physical_gpus = new Array()

      tmp_res.data.Members.forEach((val) => {
        if (val["@odata.id"].substring(49, 54) === "Video")
          all_gpus.push(uri + val["@odata.id"])
        if (
          val["@odata.id"].substring(49, 54) === "Video" &&
          val["@odata.id"].substring(61, 63) === "-1"
        )
          physical_gpus.push(uri + val["@odata.id"])
      })
      let gpu_res = await api_request(physical_gpus, token)
      let gpus = gpu_res.data.map((val) => {
        return {
          GPUStatus: val.Status === null ? "Unknown" : val.Status.Health,
          manufacturer: val.Manufacturer,
          model: val.Model,
        }
      })
      return {
        status: "success",
        vGPU: physical_gpus.length === all_gpus.length ? false : true,
        physical: physical_gpus.length,
        virtual: all_gpus.length,
        GPUs: gpus,
      }
    } else {
      return {
        tmp_res,
      }
    }
  } else {
    // Redfish version 1.4 and lower
    let tmp_url = uri + "/redfish/v1/Systems/System.Embedded.1"
    let tmp_res = await api_request(tmp_url, token)
    if (tmp_res.status === "success") {
      let pci_urls = tmp_res.data.PCIeDevices.map((val) => {
        return uri + val["@odata.id"]
      })
      let pci_res = await api_request(pci_urls, token)
      let gpus = pci_res.data
        .map((val) => {
          if (val.Manufacturer === "NVIDIA Corporation")
            return {
              GPUStatus: val.Status.Health,
              manufacturer: val.Manufacturer,
              model: val.Name,
            }
        })
        .filter(Boolean)
      return {
        status: "success",
        vGPU: null,
        physical: gpus.length,
        virtual: gpus.length,
        GPUs: gpus,
      }
    }
  }
}

async function sm_gpu(uri, token) {
  const url = uri + "/redfish/v1/Chassis/1/PCIeDevices"
  let res = await api_request(url, token)
  if (res.status === "success") {
    let gpu_urls = res.data.Members.map((val) => {
      let url_arr = val["@odata.id"].split("/")
      if (url_arr[6].substring(0, 3) === "GPU")
        return uri + val["@odata.id"] + "/PCIeFunctions/1"
    }).filter(Boolean)

    let gpu_res = await api_request(gpu_urls, token)

    let gpus = gpu_res.data.map((val) => {
      return {
        GPUStatus: val.Status.Health,
        manufacturer: val.Oem.Supermicro.GPUDevice.GPUVendor,
        model: val.Oem.Supermicro.GPUDevice.GPUModel,
      }
    })
    return {
      status: "success",
      vGPU: null,
      physical: gpu_urls.length,
      virtual: null,
      GPUs: gpus,
    }
  } else return res
}

async function hpe_gpu(uri, token) {
  // We don't have any HPE nodes with GPU's
  return {
    status: "error",
    message: "GPU request not implemented on HPE nodes",
  }
}

module.exports = {
  dell_gpu,
  sm_gpu,
  hpe_gpu,
}
