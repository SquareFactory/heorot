"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const config = require("../config.js");
const { fetch_node } = require("./nodes.js");
const rackGen = (grendel, rackArr, refetch) => __awaiter(void 0, void 0, void 0, function* () {
    var _j, _q;
    // find all nodes with matching rack name and send redfish requests
    let node_prefix = (_q = (_j = config.settings.rack.prefix.find((val) => val.type === "node")) === null || _j === void 0 ? void 0 : _j.prefix) !== null && _q !== void 0 ? _q : [];
    if (node_prefix.length === 0)
        console.error("Could not map array: 'config.settings.rack.prefix' to a type of node");
    let nodes_arr = grendel.result.filter((val) => node_prefix.includes(val.name.split("-")[0]));
    let redfish_arr = yield Promise.all(nodes_arr.map((val) => fetch_node(val.name, refetch)));
    // loop through arr generated in routes/client.js
    return rackArr.map((val) => {
        var _j, _q, _10, _11, _12, _13, _14;
        // get all nodes matching the same u that are not pdus
        let pdu_prefix = (_q = (_j = config.settings.rack.prefix.find((val) => val.type === "pdu")) === null || _j === void 0 ? void 0 : _j.prefix) !== null && _q !== void 0 ? _q : [];
        if (node_prefix.length === 0)
            console.error("Could not map array: 'config.settings.rack.prefix' to a type of pdu");
        let node = grendel.result.filter((n) => parseInt(n.name.split("-")[2]) === val.u && !pdu_prefix.includes(n.name.split("-")[0]));
        let node_output = [];
        if (node !== undefined) {
            // loop through nodes
            node.forEach((n, index) => {
                let nodeset = n.name.split("-");
                // set type from config file
                config.settings.rack.prefix.forEach((p) => {
                    val.type = p.prefix.includes(nodeset[0]) ? p.type : val.type;
                });
                // get redfish query based on node name
                let redfish_output = redfish_arr.find((val) => val.node === n.name);
                // get latest firmware versions
                let latest_bios = "";
                let latest_bmc = "";
                config.settings.bmc.firmware_versions.forEach((val) => {
                    var _j;
                    if ((_j = redfish_output === null || redfish_output === void 0 ? void 0 : redfish_output.redfish.model) === null || _j === void 0 ? void 0 : _j.match(val.model)) {
                        latest_bios = val.bios;
                        latest_bmc = val.bmc;
                    }
                });
                node_output[index] = {
                    grendel: n,
                    latest_bios,
                    latest_bmc,
                    redfish: redfish_output === null || redfish_output === void 0 ? void 0 : redfish_output.redfish,
                    notes: redfish_output === null || redfish_output === void 0 ? void 0 : redfish_output.notes,
                };
            });
        }
        let height = 0, width = 0;
        if (node.length > 0) {
            // try to calculate height and width from model name
            if (node_output[0].redfish !== undefined) {
                let node_model = (_10 = node_output[0].redfish.model) !== null && _10 !== void 0 ? _10 : "";
                config.settings.rack.node_size.forEach((size) => {
                    size.models.forEach((models) => {
                        if (node_model.match(models)) {
                            height = size.height;
                            width = size.width;
                        }
                    });
                });
            }
            // fallback function to use grendel tags for height
            if (height === 0 || width === 0) {
                let default_width = node[0].name.split("-").length === 4 ? "2" : "1";
                let str_height = (_11 = node[0].tags.find((val) => val.match(/^[0-9]{1,2}u/))) !== null && _11 !== void 0 ? _11 : "1";
                let str_width = (_12 = node[0].tags.find((val) => val.match(/^[0-9]{1,2}w/))) !== null && _12 !== void 0 ? _12 : default_width;
                height = (_13 = parseInt(str_height.replace("u", ""))) !== null && _13 !== void 0 ? _13 : 1;
                width = (_14 = parseInt(str_width.replace("w", ""))) !== null && _14 !== void 0 ? _14 : 1;
            }
        }
        return Object.assign(Object.assign({}, val), { height,
            width, nodes: node_output });
    });
});
function floorplan(grendel_query, switch_query) {
    const floorX = config.settings.floorplan.floorX;
    const floorY = config.settings.floorplan.floorY;
    let nodes = new Map();
    let switches = new Map();
    // Create maps for easy filtering
    grendel_query.result.forEach((val) => {
        let rack = val.name.substring(4, 7);
        let tmp = typeof nodes.get(rack) === "object" ? nodes.get(rack) : [];
        nodes.set(rack, [...tmp, val]);
    });
    switch_query.forEach((val) => {
        let rack = val.node.substring(4, 7);
        let tmp = typeof switches.get(rack) === "object" ? switches.get(rack) : [];
        switches.set(rack, [...tmp, val]);
    });
    // Main floorplan generation
    let floorplan = [];
    floorX.forEach((row) => {
        floorY.forEach((col) => {
            var _j, _q;
            let rack = row + col;
            let rackArr = (_j = nodes.get(rack)) !== null && _j !== void 0 ? _j : [];
            let switchArr = (_q = switches.get(rack)) !== null && _q !== void 0 ? _q : [];
            let nodeCounts = nodeCount(rackArr);
            let switchInfo = swDisplay(switches.get(rack));
            floorplan.push({
                rack: rack,
                // avoid doing client calculations
                // nodes: rackArr,
                // switches: switchArr,
                slurm: compareTags(rackArr),
                node_count: nodeCounts.node_count,
                u_count: nodeCounts.u_count,
                nodes_color: config.settings.floorplan.default_color,
                default_color: config.settings.floorplan.default_color,
                switchInfo,
            });
        });
    });
    return { status: "success", config: config.settings.floorplan, result: floorplan };
}
// Local functions:
// rack information
const nodeCount = (arr) => {
    let node_count = 0;
    let u_count = 0;
    arr.forEach((val) => {
        let type = val.name.substring(0, 3);
        if (!["pdu"].includes(type)) {
            if (!["swe", "swi"].includes(type))
                node_count++;
            u_count++;
            // check for mult u nodes
            if (val.tags !== null) {
                val.tags.forEach((val) => {
                    if (val.match(/^[0-9]{1,2}u/)) {
                        u_count += parseInt(val.match(/^[0-9]{1,2}/)) - 1;
                    }
                });
            }
        }
    });
    return { node_count, u_count };
};
// set rack partitions and colors
const compareTags = (arr) => {
    let output = {
        partition: "",
        color: config.settings.floorplan.secondary_color,
    };
    let tags = new Set();
    if (arr !== undefined && arr.length > 0) {
        arr.forEach((val) => {
            if (val.tags !== null)
                val.tags.forEach((tag) => tags.add(tag));
        });
        config.settings.floorplan.tag_mapping.forEach((val) => {
            if (tags.has(val.tag) && output.partition === "") {
                output.partition = val.tag;
                output.color = val.color;
            }
            else if (tags.has(val.tag) && output.partition !== "") {
                output.partition = config.settings.floorplan.tag_multiple.tag;
                output.color = config.settings.floorplan.tag_multiple.color;
            }
        });
    }
    return output;
};
// switch display info
const swDisplay = (switches) => {
    let output = {
        sw_models: [],
        sw_models_color: config.settings.floorplan.default_color,
        sw_versions: [],
        sw_versions_color: config.settings.floorplan.default_color,
        sw_ratios: [],
        sw_ratios_color: config.settings.floorplan.default_color,
    };
    let tmpModels = [];
    let tmpVersions = [];
    let tmpRatios = [];
    if (switches !== undefined) {
        switches.forEach((val) => {
            tmpModels.push(shortenName(val.system.model));
            tmpVersions.push(shortenVersion(val.system.version));
            tmpRatios.push(val.info.active_oversubscription);
        });
        // model color mapping | based on if a switch model is present in the rack
        let tmpModelColor = config.settings.floorplan.secondary_color;
        config.settings.floorplan.model_color.forEach((val) => {
            if (tmpModels.find((x) => x.match(val.model)))
                tmpModelColor = val.color;
        });
        output.sw_models_color = tmpModelColor;
        // Version color mapping
        let tmpVersionColor = config.settings.floorplan.secondary_color;
        config.settings.floorplan.version_color.forEach((val) => {
            if (tmpVersions.find((x) => x.match(val.version)))
                tmpVersionColor = val.color;
        });
        output.sw_versions_color = tmpVersionColor;
        // Count duplicates
        output.sw_models = swDuplicates(tmpModels);
        output.sw_versions = swDuplicates(tmpVersions);
        output.sw_ratios = swDuplicates(tmpRatios);
    }
    return output;
};
// Replace duplicates with "(count)name"
const swDuplicates = (duplicates) => {
    let tmp = duplicates.reduce((count, current) => ((count[current] = count[current] + 1 || 1), count), {});
    return Object.keys(tmp)
        .map((val) => {
        let count = tmp[val] > 1 ? `(${tmp[val]})` : "";
        if (val !== "undefined")
            return `${count}${val}`;
        return null;
    })
        .filter(Boolean);
};
const shortenName = (name) => {
    if (name !== null || name !== undefined) {
        if (name.match("^PowerConnect"))
            return "PC" + name.substring(13);
        else if (name.match("-ON"))
            return name.replace("-ON", "");
        else
            return name;
    }
    else
        return "undefined";
};
const shortenVersion = (version) => {
    if (version !== null || version !== undefined)
        return version.replace(/ *\([^)]*\) */g, "");
    else
        return "undefined";
};
module.exports = { rackGen, floorplan };
