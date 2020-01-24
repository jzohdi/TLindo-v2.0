const BASE_ROOT = "/static/MyScripts/";

function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

const encodeToString = function(paramDictionary) {
  return "?" + encodeURIComponent(JSON.stringify(paramDictionary));
};
const urlEncodeParams = function(paramDictionary) {
  window.history.replaceState({}, "", encodeToString(paramDictionary));
};

const urlDecodeParams = function() {
  const urlSearchString = window.location.search;
  if (!urlSearchString.includes("?")) return {};
  try {
    const paramDictionary = JSON.parse(
      decodeURIComponent(urlSearchString.replace("?", ""))
    );
    return paramDictionary;
  } catch {
    window.history.replaceState({}, "", "");
    return {};
  }
};

function objectsAreEqual(o1, o2, arrayToExclude = []) {
  const keys = new Set(Object.keys(o1).concat(Object.keys(o2)));
  arrayToExclude.forEach(key => keys.delete(key));
  for (const key of keys) {
    if (!(o1[key] === o2[key])) return false;
  }
  return true;
}
/*
 SHUTDOWN OVER RIDE FOR DEVELOPMENT ONLY TAKE OUT BEFORE DEPOLOYMENT
*/
function shutDown(password) {
  $.post($SCRIPT_ROOT + "/shutdown?pw=" + password, {}, function(
    data,
    textStatus
  ) {});
}
const urlDictionary = urlDecodeParams();
function setPicker(selectDate = urlDictionary["date"]) {
  if (selectDate == undefined) {
    selectDate = sessionStorage.getItem("date");
  }
  const finalArrayOfDates = [];
  $.get("/disabled_dates", function(data) {
    data.forEach(function(element, index) {
      const formatDate = new Date(element);
      finalArrayOfDates.push(formatDate);
    });
    setDatePicker(selectDate, finalArrayOfDates);
  });
}

function setDatePicker(selectDate, finalArrayOfDates) {
  let ele = document.getElementById("datepicker");
  if (ele) {
    $("#datepicker").on("change", function() {
      sessionStorage.setItem("date", $("#datepicker").val());
    });
    var $input = $("#datepicker").pickadate({
      today: ""
    });
    var picker = $input.pickadate("picker");
    let minDate = new Date();
    picker.set("min", [
      minDate.getFullYear(),
      minDate.getMonth(),
      minDate.getDate() + 2
    ]);
    picker.set("disable", finalArrayOfDates);
    if (selectDate != undefined) {
      picker.set("select", selectDate);
    }
    // console.log("picker set");
  }
}

setPicker();
