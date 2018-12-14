// set up the window variables that can be used later. including
// getting whether the user is on a phone device or desktop.
var defaultMaxFlavors = 4;
var eventVariables = {};
window.device;
function getDevice() {
  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  ) {
    window.device = "mobile";
  } else {
    window.device = "desk";
  }
}
// get variable to use later about the size of the users screen.
var windowWidth = window.innerWidth;

function setPicker() {
  // collect dates to disable for picker + check to see if element exists on page.
  let finalArrayOfDates = [];
  // earlier the list of dates to exclude are set in the element that is hidden with id of dates-to-hide
  // here we get those dates, and convert them with new Date() to raw datetime data which
  // can be used by the date picker in the form of an array of dates to disable
  let disableDates = document.getElementById("dates-to-hide");

  if (typeof disableDates !== "undefined" && disableDates !== null) {
    disableDates = disableDates.innerHTML;
    disableDates = eval(disableDates);

    for (let y = 0; y < disableDates.length; y++) {
      let formatDate = new Date(disableDates[y]);
      finalArrayOfDates.push(formatDate);
    }
  }
  // make sure that the element with id datepicker is available,
  // TODO // ? pass ID in as parameter

  let ele = document.getElementById("datepicker");
  if (ele) {
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
    console.log("picker set");
  }
  // if using time picker as well to select for time of the day.
  let el = document.getElementById("timepicker");
  if (el) {
    var $timeInput = $("#timepicker").pickatime();
    var timePicker = $timeInput.pickatime("picker");
    let minTime = [11, 00];
    let maxTime = [20, 00];
    timePicker.set("min", minTime);
    timePicker.set("max", maxTime);
  }
}

/*
copy text to clipBoard
*/
function copyToClipBoard(textValue) {
  if (textValue == "phoneNumber") {
    navigator.clipboard.writeText("8562143413").then(
      function() {
        alert("Copied to clipboard");
      },
      function() {
        console.log("failed to copy");
      }
    );
  }
}
/*
Functions below are functions used to javascript page interaction for setting a new
*/

/*
 * plan event is an event listener that fires when the user selects in the date picker box
 *
 */
function planEvent() {
  let dateSelector = $("#datepicker");

  document.querySelector('input[name="date"]').onchange = changeEventHandler;
}
// calling this function will get JSON data about the menu and other settings for building page
function initSettings(idOfMin) {
  let params;
  $.getJSON($SCRIPT_ROOT + "/_get_menu", {}, function(data) {
    window.PageSettings = data;
    $(idOfMin).append(data.minsize);
  });
}
/*
 SHUTDOWN OVER RIDE FOR DEVELOPMENT ONLY TAKE OUT BEFORE DEPOLOYMENT
*/
function shutDown() {
  $.post($SCRIPT_ROOT + "/shutdown", {}, function(data, textStatus) {});
}
/*
 * here we simiply show the message on first screen that tells customer
 * to call if date not available or party is too small.
 */
function changeEventHandler(event) {
  if (!event.target.value) console.log("nothing here");
  else {
    let showPhone = $("#need-phone");
    if (showPhone.hasClass("hidden")) {
      showPhone.removeClass("hidden").addClass("fade-in-right");
    }
  }
  let nextButton = $("#next-button");
  if (nextButton.hasClass("hidden")) {
    let cssAnimationTiming =
      " -webkit-animation-duration: 2s; animation-duration: 2s";
    nextButton[0].setAttribute("style", cssAnimationTiming);
    nextButton.removeClass("hidden").addClass("fade-in-left");
  }
}
// this function is called by the button an adds css stlying to give the animation
// effect on hovering over the next button
function arrowMove(idOfElement) {
  let next_Arrow = $(idOfElement);
  next_Arrow.css("padding-left", "14px");
}
function arrowMoveBack(idOfElement) {
  let next_Arrow = $(idOfElement);
  next_Arrow.css("padding-left", "0px");
}
function nextWindow() {
  // get the date value input from the calender and set it inside window, so can be called later.
  let eventDate = document.getElementById("datepicker").value;
  eventVariables.date = eventDate;

  fadeOutMain();

  setTimeout(function() {
    [$("#event-planner"), $("#need-phone"), $("#next-button")].map(div =>
      div.empty()
    );
    let howManyPeopleDiv =
      '<div id="card2" class="col-md-6 col-md-offset-3 main-card fade-in-right">' +
      ' <h4 class="question-titles">How many people will be at your event?</h4>' +
      '<div class="form-group">' +
      '<h5 class="question-titles">Adults: <input name="adults" class="form-control" /></h5>' +
      "</div>" +
      '<div class="form-group">' +
      '<h5 class="question-titles">' +
      '&nbsp;&nbsp;&nbsp;&nbsp;Kids: <input name="kids" class="form-control" />' +
      "</h5>" +
      "</div>" +
      "</div>";
    $("#event-planner").append(howManyPeopleDiv);
    // let showRequireMent =
    // '<div id="card3 class="col-md-6 col-md-offset-3 main-card fade-in-left">'+
    // '<h4 class="question-title"> If planning an event for less than 8 people,<br>Give us a call'
    // '</div>';
    let buttonDiv =
      '<div id="button1" style="-webkit-animation-duration: 1s; animation-duration: 1s;" class="col-md-6 col-md-offset-3 fade-in-left">' +
      '<button onclick="nextWindow2()" onmouseout="arrowMoveBack(\'#next-arrow\')" onmouseover="arrowMove(\'#next-arrow\')" class="button button1">' +
      'Next <span id="next-arrow" class="glyphicon glyphicon-menu-right"></span> </button> </div>';
    $("#next-button").append(buttonDiv);
  }, 1000);
}

function nextWindow2() {
  /* get data within input forms, convert to Integer, if less than 8, show message */

  let adultsNum = document.querySelector('input[name="adults"]').value;
  adultsNum = adultsNum !== "" ? parseInt(adultsNum) : 0;

  let kidsNum = document.querySelector('input[name="kids"]').value;
  kidsNum = kidsNum !== "" ? parseInt(kidsNum) : 0;

  let totalPeople = parseInt(adultsNum) + parseInt(kidsNum);

  if (totalPeople < window.PageSettings.minsize) {
    if (document.getElementById("card3") === null) {
      let lessThanMin =
        '<div id="card3" class="col-md-6 col-md-offset-3 main-card fade-in-right"> <h4 class="question-titles">' +
        "The minimum number of people to reserve a catering event is " +
        window.PageSettings.minsize +
        ", <br>" +
        "but let's see if we can help out. Give us a call </h4>" +
        '<a class="question-titles" href="tel:+1-856-214-3413">(856)-214-3413</a> </div>';
      $("#need-phone").append(lessThanMin);
    }
  } else {
    eventVariables.numberOfPeople = { adults: adultsNum, kids: kidsNum };
    fadeOutMain();
    $("#card1").addClass("fade-out-left");
    setTimeout(function() {
      [
        $("#top-message"),
        $("#event-planner"),
        $("#need-phone"),
        $("#next-button")
      ].map(div => div.empty());
      /* Javascrip the third page into screen */
      setStep3();
    }, 1000);
  }
}

function fadeOutMain() {
  let datePlanner = $("#card2");
  let needPhone = $("#card3");
  let nextButton = $("#button1");
  let helpScreen = $("#card4");

  datePlanner.addClass("fade-out-right");
  if (document.getElementById("card3") === null) {
    nextButton.addClass("fade-out-left");
  } else {
    needPhone.addClass("fade-out-left");
    nextButton.addClass("fade-out-right");
  }
  helpScreen.addClass("fade-out-right");
}

function setStep3() {
  let newDiv =
    '<div id="card2" class="col-md-6 col-md-offset-3 main-card fade-in-right question-titles">' +
    "<h4> Not sure what's going to be the perfect amount to order for your event?</h4><h4> We'd love to help!</h4>" +
    "<h4>Based on the number of people, we can recommend <br>how much food to get for your gathering.</h4>" +
    "</div>";

  $("#top-message").append(newDiv);

  let newDiv2 =
    '<div onclick="setUpHelpScreen(\'nohelp\')" id="card3" class="card-margin1 col-md-4 col-md-offset-2 main-card fade-in-left">' +
    '<h4 class="question-titles">No Thanks, I know how much I want' +
    "</h4></div>" +
    '<div onclick="setUpHelpScreen(\'help\')" id="card4" class="card-margin2 col-md-4 main-card fade-in-right">' +
    '<h4 class="question-titles">I could use some help!' +
    "</h4></div>";

  $("#event-planner").append(newDiv2);
}
/* Start the help screen for selecting the items
   or menu seletion without help.
   If no help then call function startSelectionScreen */
function setUpHelpScreen(needHelp) {
  fadeOutMain();

  setTimeout(function() {
    [$("#top-message"), $("#event-planner")].map(div => div.empty());
    if (needHelp === "help") startHelpScreen();
    if (needHelp === "nohelp") startSelectionScreen();
  }, 1000);
}
/* *************************************************************************
   start menu selection screen 
   window.selectedFoodOptions will keep track of the items chosen

*/
function startSelectionScreen(
  max_Items = 100,
  max_Flavors = defaultMaxFlavors,
  help = false
) {
  window.selectedFoodOptions = {};
  window.selectedFoodOptions["Id"] = "my_cart";
  window.selectedFoodOptions.help = help;
  window.selectedFoodOptions["max_Items"] = max_Items;
  window.selectedFoodOptions["max_Flavors"] = max_Flavors;

  window.my_cart = [];

  window.foodCounter = {};
  foodCounter["total"] = 0;

  let helpDiv = "";
  if (help) {
    helpDiv +=
      "<h4>Based on your party size, please select a total of " +
      max_Items +
      " items</h4>";
  }
  let helperScreenDiv =
    '<div id="card2" class="col-md-8 col-md-offset-2 main-card fade-in-left helper-screen question-titles">' +
    helpDiv +
    "<div class='row normalize-height'><div id='food-options' class='col-md-6'><h3 class='main-menu-headers' >" +
    "Entree Options</h3></div>" +
    "<div id='selected-food' class='col-md-6'><h3 class='main-menu-headers' >Selected Items</h3>" +
    "<div id=" +
    selectedFoodOptions["Id"] +
    " class='row'></div></div></div><div class='button button1 checkout-button col-xs-5 col-sm-3'>Checkout</div></div>";

  $("#top-message").append(helperScreenDiv);

  // need to pass in the id of the entree div
  showEntreeOptions("#food-options");
}

/*
 To avoid mutating the pageSettings dictionary of the menu, create new window dictionary to hold the details 
 for the entree items; 
 iterate throught entreeItems, holding these values and assign the values to the key value of index.
 if itemDictionary index is called, it will return the details for that item.
*/
function showEntreeOptions(idOfEntreeDiv) {
  window.itemDictionary = {};

  let entreeItems = window.PageSettings["entree"];
  let categories = entreeItems.splice(-1);

  $.each(entreeItems, function(index, value) {
    insertDivToOptions(idOfEntreeDiv, index, value.item);
    window.itemDictionary[index] = value;
  });
}

// each of the entree items gets created on the page with this div element, show selection
// is called with the index of the item which can be used to get the key value pair of itemDictionary
function insertDivToOptions(idOfElement, index, item_name) {
  let divToAppend =
    '<div id="' +
    index +
    '" class="entree-options row"><div class="entree-item col-xs-6" onclick="showSelection(' +
    index +
    ')">' +
    item_name +
    "</div></div>";
  $(idOfElement).append(divToAppend);
}

// Show slection parameter is the key for the value pair of itemdictionary. which was set as the index
// of the item.
function showSelection(itemDictIndex) {
  let itemSelection = window.itemDictionary[itemDictIndex];

  // keep a tempory copy of the cart array to revert back to.
  var temp_cart_array = JSON.parse(
    JSON.stringify(window[selectedFoodOptions["Id"]])
  );
  // console.log(temp_cart_array);
  // all selected will hold the item values for this item on the current modal
  window.addItems = false;

  window.allSelected = [];

  // for items that have previously been added to the cart, show them on the modal,
  //  pop them out of the cart and they will be added back at the end
  let temp_array_other = [];
  window[selectedFoodOptions["Id"]].forEach(function(element, index) {
    if (element.name == itemSelection.item) {
      allSelected.push(element);
    } else {
      temp_array_other.push(element);
    }
  });
  window[selectedFoodOptions["Id"]] = temp_array_other;

  // keep a temporary copy of the foodCounter to revert back to if the modal is closed without confirming add items
  var temp_food_count = JSON.parse(JSON.stringify(foodCounter));

  // the main modal screen with div class='modal-content' holding the content and data
  let modalDiv =
    '<div id="myModal" class="modal question-titles"><div class="modal-content main-card">' +
    '<span class="close">X</span>' +
    getModalContent("allSelected", itemSelection.item, itemSelection) +
    "</div></div>";
  $("#event-planner").append(modalDiv);

  let modal = document.getElementById("myModal");
  let openButton = document.getElementById(itemDictIndex.toString());
  let span = document.getElementsByClassName("close")[0];
  let done = document.getElementById("done");

  // these define clicking actions for opening and closing the modal
  openButton.onclick = function() {
    modal.style.display = "block";
    if (allSelected.length > 0) {
      drawToSelection("allSelected", "modal-selection", "");
    }
  };
  span.onclick = function() {
    // if closed window without adding items, revert back to original cart.
    if (window.addItems == false) {
      foodCounter = temp_food_count;
      window[window.selectedFoodOptions["Id"]] = temp_cart_array;
    }
    modal.style.display = "none";
    $("#event-planner").empty();
  };
  window.onclick = function(event) {
    if (event.target == modal) {
      // if closing without adding items, revert cart.
      if (window.addItems == false) {
        foodCounter = temp_food_count;
        window[window.selectedFoodOptions["Id"]] = temp_cart_array;
      }
      modal.style.display = "none";
      $("#event-planner").empty();
    }
  };
}

// getModalContent returns the content to appear inside the modal pop up
function getModalContent(windowArray, itemName, itemSettings) {
  let idForSelectedList = "modal-selection";
  let content =
    // the item selected name
    "<h4>" +
    itemSettings.item +
    ": </h4>" +
    "<h4>" +
    // the top section of the modal
    getHeaderForModal(itemSettings) +
    "</h4>";
  content +=
    "<div class='selection row'>" +
    // creates the selection with options for flavor and sizes
    getSelectionForItem(itemSettings) +
    "<div onclick='getWantedItem(\"" +
    itemSettings.item +
    '", "' +
    idForSelectedList +
    "\")'class='col-xs-2 col-xs-offset-8 add-select'>Select</div></div>";
  content +=
    '<div class="row modal-add-to-order">Items to Add to Order</div><div id="' +
    idForSelectedList +
    '"class="row"></div><div class="row"><div onclick="addSelectionToCart(\'' +
    "selectedFoodOptions" +
    "','" +
    itemName +
    '\')" class="col-xs-2 col-xs-offset-3 add-select">Add Items</div></div>';
  return content;
}

// the top section of the modal
function getHeaderForModal(itemSettings) {
  return itemSettings.description;
}
// creates a selection div with all the key value properties available for that food item.
function getSelectionForItem(itemSettings) {
  let temp_Dictionary = JSON.parse(JSON.stringify(itemSettings));
  delete temp_Dictionary["description"];
  delete temp_Dictionary["item"];
  //
  let content = '<div class="col-md-2">Please Select From Options:</div>';

  for (var key in temp_Dictionary) {
    if (temp_Dictionary.hasOwnProperty(key)) {
      content += getSelectDiv(key, temp_Dictionary[key].split(","));
    }
  }

  return content;
}

// iterate throguth the values of the array and returns select, option element
function getSelectDiv(key, array) {
  if (key.slice(-1) == "s") {
    key = key.slice(0, -1);
  }
  let content =
    "<div class='col-sm-6 col-md-4'> Choose " +
    key +
    " : <select class='select-setting'>";
  $.each(array, function(index, value) {
    // value = value.replace(" ", "");
    content += "<option value='" + key + "'>" + value + "</option>";
  });
  content += "</select></div>";
  return content;
}
// when Select item presed, get the key, value pairings for each of the selection options.
function getWantedItem(nameOfItem, cartId) {
  let $selected = $(".select-setting");
  let thisItem = { count: 1, name: nameOfItem };
  // create object with key value pairs
  $.each($selected, function(index, value) {
    thisItem[
      $(value)
        .find("option:selected")
        .val()
    ] = $(value)
      .find("option:selected")
      .text();
  });

  // need to make deep copy;
  let new_Object = JSON.parse(JSON.stringify(thisItem));

  let message = keepCountOfItemsAndFlavors(new_Object, 1);
  // if there was not error message and if append returns false, push to end of item_object array.
  if (message == "") {
    let alreadyAdd = appendSelection("allSelected", thisItem);
    if (!alreadyAdd) window.allSelected.push(thisItem);
  }
  drawToSelection("allSelected", cartId, message);
}
/*
  @ params the key for window that is an array of menu objects, and the item object updating the list with
  returns true if the item was already in the list, and the count was appened,
  returns false if the item was not in the array.
*/
function appendSelection(array_of_items, item_Object) {
  let temp_object = Object.assign({}, item_Object);
  delete temp_object.count;

  let added_to_list = false;

  window[array_of_items].forEach(function(element) {
    let temp_Other = Object.assign({}, element);
    delete temp_Other.count;

    if (JSON.stringify(temp_object) === JSON.stringify(temp_Other)) {
      element.count += 1;

      added_to_list = true;
    }
  });

  return added_to_list;
}

function keepCountOfItemsAndFlavors(item_Object, action) {
  // console.log("keep-count", item_Object, action);
  if (window.foodCounter["total"] + action > selectedFoodOptions["max_Items"]) {
    return '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1"> Currently at order limit</div>';
  }
  let keys = Object.keys(foodCounter);
  if (keys.indexOf(item_Object.name) >= 0) {
    // console.log(foodCounter[item_Object.name]);
    var objectsListForName = foodCounter[item_Object.name];
  } else {
    // come here if the item does not exist in counter yet, in this case, we will always be adding a new Dish/Flavor
    foodCounter[item_Object.name] = {
      flavors: [item_Object.flavor],
      items: []
    };
    let new_item = {};
    for (key in item_Object) {
      new_item[key] = item_Object[key];
    }
    foodCounter[item_Object.name]["items"].push(new_item);
    foodCounter["total"] += 1;
    return "";
  }
  // console.log(objectsListForName);
  // check to see if the flavor for this item would be a new flavor, so we can stop from exceding flavor limit

  // if it is a new flavor, and adding a new flavor excedes limit, return error message;
  if (foodCounter[item_Object.name].flavors.includes(item_Object.flavor)) {
    appendOrAddItem(item_Object, action);
    return "";
  } else {
    if (foodCounter[item_Object.name].flavors.length == 4) {
      return '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1"> Already at Max unique flavors for item</div>';
    } else {
      appendOrAddItem(item_Object, action);
      return "";
    }
  }
}

function appendOrAddItem(item_Object, action) {
  let temp_object = Object.assign({}, item_Object);
  delete temp_object.count;

  for (let x = 0; x < foodCounter[item_Object.name]["items"].length; x++) {
    let temp_other = Object.assign(
      {},
      foodCounter[item_Object.name]["items"][x]
    );
    delete temp_other.count;
    if (JSON.stringify(temp_object) === JSON.stringify(temp_other)) {
      foodCounter[item_Object.name]["items"][x].count += action;
      foodCounter["total"] += action;
      // added = true;
      // console.log("got here");
      if (foodCounter[item_Object.name]["items"][x].count <= 0) {
        foodCounter[item_Object.name]["items"].splice(x, 1);
      }
      reconcileFlavors(item_Object.name);
      return;
    }
  }
  // if ( !added ){
  if (!foodCounter[item_Object.name].flavors.includes(item_Object.flavor)) {
    foodCounter[item_Object.name].flavors.push(item_Object.flavor);
  }
  foodCounter[item_Object.name]["items"].push(item_Object);
  foodCounter["total"] += action;
  // console.log("got there");
  // }
}

// create a new flavor, array and add all the flavors found in the cart,
// so the flavors array consistently contains only the flavors and all of the flavors
function reconcileFlavors(item_name) {
  let temp_flavor_array = [];
  foodCounter[item_name].items.forEach(function(element) {
    if (!temp_flavor_array.includes(element.flavor))
      temp_flavor_array.push(element.flavor);
  });
  foodCounter[item_name].flavors = temp_flavor_array;
}
/**
 * @ params the name of the window global object, and the key of that object.
 * iterate through the object at this key, getting the 2D array of the full order
 * create the list div with +  - option for the number of each item. uses the id stored in the
 * object as id of element to insert into.
 */

function drawToSelection(array_name, cartId, message) {
  // console.log(array_name);

  let itemsArray = window[array_name];

  let $id = cartId;
  // console.log(itemsArray);
  $("#" + $id).empty();
  let itemsDiv = message;
  $.each(itemsArray, function(index, value) {
    itemsDiv +=
      '<div class="col-xs-12 col-sm-10 col-sm-offset-1"><span onclick="appendValue(\'' +
      array_name +
      "', '" +
      index +
      "', '" +
      "1', '" +
      // key +
      // ", "
      //  +
      cartId +
      "')\"> + </span>" +
      value.count +
      " <span onclick=\"appendValue('" +
      array_name +
      "', '" +
      index +
      "', '" +
      "-1', '" +
      // key +
      // ", " +
      cartId +
      "')\"> - </span>";
    for (key in value) {
      if (key != "count") itemsDiv += " " + value[key] + ",";
    }

    itemsDiv = itemsDiv.slice(0, itemsDiv.length - 1) + "</div>";
  });

  $("#" + $id).append(itemsDiv);
  // console.log(itemsArray);
}

function appendValue(array_name, index, value, cartId) {
  // console.log(" appending", array_name, index, value, cartId);
  index = parseInt(index);
  value = parseInt(value);

  // console.log(array_name, index, value, key);
  let item_name = window[array_name][index].name;

  let new_Object = JSON.parse(JSON.stringify(window[array_name][index]));

  let message = keepCountOfItemsAndFlavors(new_Object, value);

  if (message == "") {
    window[array_name][index].count += value;
  }
  window[array_name] = window[array_name].filter(function(element) {
    return element.count > 0;
  });
  drawToSelection(array_name, cartId, message);
}
// if addSelection to cart, push everything in allselected cart to main card, and set addItems ot true.
function addSelectionToCart(windowArray, itemName) {
  let $id = window[windowArray]["Id"];
  $.each(window["allSelected"], function(index, value) {
    window[$id].push(value);
  });
  drawToSelection($id, $id, "");
  window.addItems = true;
  document.getElementsByClassName("close")[0].click();
}

function startHelpScreen() {
  console.log("Help");
  let maxItems = Math.floor(
    (eventVariables.numberOfPeople.adults +
      eventVariables.numberOfPeople.kids) /
      parseInt(window.PageSettings.minsize)
  );
  let maxFlavors = Math.min(maxItems, 4);

  startSelectionScreen(maxItems, maxFlavors, true);
}
