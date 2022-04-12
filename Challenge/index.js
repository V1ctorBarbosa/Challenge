const fs = require("fs");
const _ = require("lodash");
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

function mergeElements(array, obj, existentElement) {
  obj.group = _.uniq(_.concat(obj.group, existentElement.group));
  obj.addresses = _.concat(obj.addresses, existentElement.addresses)
  var index = array.findIndex(function (o) {
    return o.eid === obj.eid;
  })
  array.splice(index, 1);
}

function findByEid(array, eid) {
  return array.find(element => element.eid == eid)
}

function isTrue(value) {
  return value == "yes" || value == 1
}

function isFalse(value) {
  return value == "no" || value == 0
}

function addOrUpdate(obj, key, value) {
  return key in obj ? _.concat(obj[key], value) : value
}

function splitByComma(array) {
  return array.split(",").map(item => item.trim())
}

function isAddress(value) {
  return value.includes("email") || value.includes("phone")
}

function updateAddresses(obj, key, value) {
  var address = formatAddresses(key, value);
  obj.addresses = _.concat(obj.addresses, address)
}

function formatAddresses(key, value) {
  let splittedKey = key.replace(/['"]+/g, '').split(' ');
  let type = splittedKey[0];
  let tags = splittedKey.slice(1)

  value = value.replace("/", ",")
  let result = []
  let values = value.split(",")
  _.forEach(values, function (val) {
    if (type !== "phone") {
      result.push({
        type,
        tags,
        address: val
      })
      return;
    }

    if (isNaN(val.replace(/[^A-Z0-9]/ig, ''))) {
      return;
    } else {
      val = phoneUtil.parseAndKeepRawInput(val, 'BR');
      val = phoneUtil.format(val, PNF.E164)
      val = val.replace("+", '')
      result.push({
        type,
        tags,
        address: val
      })
    }
  })

  return result
}

function parseCsv(file) {
  csv = fs.readFileSync(file, "utf8")

  var array = csv.toString().split("\n");
  let result = [];
  let headers = array[0].split(",")

  for (let i = 1; i < array.length; i++) {
    let obj = {}

    let str = array[i]
    let s = ''

    let flag = 0
    for (let ch of str) {
      if (ch === '"' && flag === 0) {
        flag = 1
      }
      else if (ch === '"' && flag == 1) flag = 0

      if (ch === ',' && flag === 0) ch = '|'

      if (ch !== '"') s += ch
    }

    let properties = s.split("|")

    obj.addresses = []

    for (let j in headers) {
      properties[j] = properties[j].replaceAll("/", ",");

      if (properties[j] === "") {
        continue;
      }

      if (isAddress(headers[j])) {
        updateAddresses(obj, headers[j], properties[j])
        continue;
      }

      if (properties[j].includes(",")) {
        let propertiesArray = splitByComma(properties[j]);
        obj[headers[j]] = addOrUpdate(obj, headers[j], propertiesArray)
        continue;
      }

      if (isTrue(properties[j])) {
        obj[headers[j]] = true
        continue;
      }

      if (isFalse(properties[j])) {
        obj[headers[j]] = false
        continue;
      }

      obj[headers[j]] = addOrUpdate(obj, headers[j], properties[j].trim())
    }

    let existentElement = findByEid(result, obj.eid)

    if (existentElement) {
      mergeElements(result, obj, existentElement)
    }

    result = _.concat(result, obj);
  }

  return result;
}

let result = parseCsv("input.csv");

let json = JSON.stringify(result);
fs.writeFileSync('output.json', json);