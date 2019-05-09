var helpSizeConversion = {
  "Taco Tray": 24,
  "Burrito Tray": 8,
  "Nacho Bar": 10,
  "Rotisserie Chicken": 10
};

var setPrices = function setPrices() {
  // const pricesString = sessionStorage.getItem("entree_prices");
  // if (typeof pricesString != typeof "string") {
  $.get("/get_prices/", function (data) {
    sessionStorage.setItem("entree_prices", JSON.stringify(data));
  }); // }
};

setPrices();

var printf = function printf(content) {
  console.log(content);
};

var deepCopy = function deepCopy(o) {
  return JSON.parse(JSON.stringify(o));
};

var equals = function equals(o1, o2) {
  return JSON.stringify(o1) === JSON.stringify(o2);
};

var getDifference = function getDifference(a, b) {
  var i = 0;
  var j = 0;
  var result = "";

  while (j < b.length) {
    if (a[i] != b[j] || i == a.length) result += b[j];else i++;
    j++;
  }

  return result;
}; // are o1 and o2 deep equal except for a single key


var equalsExcept = function equalsExcept(o1, o2, keys) {
  var o1Copy = deepCopy(o1);
  var o2Copy = deepCopy(o2);
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = keys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var _key = _step.value;
      delete o1Copy[_key];
      delete o2Copy[_key];
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return != null) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  var areEqual = equals(o1, o2) || getDifference(JSON.stringify(o2Copy), JSON.stringify(o1Copy)).length == 0; // console.log(areEqual);

  return areEqual;
};

var savePageLayout = function savePageLayout(page, divIdArray) {
  window[page] = {};
  divIdArray.forEach(function (div) {
    window[page][div] = $(div).html();
  });
};

var setInputs = function setInputs(arrayOfInputElements, arrayOfValues) {
  arrayOfInputElements.forEach(function (element, index) {
    $(element).val(arrayOfValues[index]);
  });
};

function fadeOutSections() {
  var other = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var count = 0;
  other.forEach(function (element) {
    $(element).addClass(count % 2 == 0 ? "fade-out-right" : "fade-out-left");
    count++;
  });
}

var prevWindow = function prevWindow(pageNum) {
  if (pageNum === "page1") {
    fadeOutSections(["#card2", "#button1", "#button2"]);
  }

  if (pageNum === "page2") {
    fadeOutSections(["#card2", "#card3", "#card4", "#button2"]);
  }

  var pageDivs = window[pageNum];
  setTimeout(function () {
    for (var key in pageDivs) {
      if (pageDivs.hasOwnProperty(key)) {
        $(key).html(pageDivs[key]);
      }
    }

    if (pageNum === "page1") setPicker(window.eventVariables.date);
    if (pageNum === "page2") setInputs(['input[name="adults"]', 'input[name="kids"]'], [window.eventVariables.numberOfPeople.adults, window.eventVariables.numberOfPeople.kids]);
  }, 1000);
};

var resetFoodCounterAndCart = function resetFoodCounterAndCart(savedCount) {
  if (window.addItems == false) {
    foodCounter = savedCount; // window[window.selectedFoodOptions["Id"]] = savedCart;
  }
}; // set up the window variables that can be used later. including
// getting whether the user is on a phone device or desktop.


var defaultMaxFlavors = 4;
var eventVariables = {};
window.device;

function getDevice() {
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    window.device = "mobile";
  } else {
    window.device = "desk";
  }
} // get variable to use later about the size of the users screen.


var windowWidth = window.innerWidth;

function setPicker() {
  var selectDate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
  var disabled = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
  // collect dates to disable for picker + check to see if element exists on page.
  var finalArrayOfDates = []; // earlier the list of dates to exclude are set in the element that is hidden with id of dates-to-hide
  // here we get those dates, and convert them with new Date() to raw datetime data which
  // can be used by the date picker in the form of an array of dates to disable

  var disableDates = document.getElementById("dates-to-hide");

  if (typeof disableDates !== "undefined" && disableDates !== null) {
    disableDates = disableDates.innerHTML;
    disableDates = eval(disableDates);

    for (var y = 0; y < disableDates.length; y++) {
      var formatDate = new Date(disableDates[y]);
      finalArrayOfDates.push(formatDate);
    }
  }

  if (disabled != undefined) {
    finalArrayOfDates = JSON.parse(disabled);
    finalArrayOfDates.forEach(function (val, index) {
      finalArrayOfDates[index] = new Date(val);
    });
  } // make sure that the element with id datepicker is available,
  // TODO // ? pass ID in as parameter
  // console.log(finalArrayOfDates);


  var ele = document.getElementById("datepicker");

  if (ele) {
    var $input = $("#datepicker").pickadate({
      today: ""
    });
    var picker = $input.pickadate("picker");
    var minDate = new Date();
    picker.set("min", [minDate.getFullYear(), minDate.getMonth(), minDate.getDate() + 2]);
    sessionStorage.setItem("disabledDates", JSON.stringify(finalArrayOfDates));
    picker.set("disable", finalArrayOfDates);

    if (selectDate) {
      picker.set("select", selectDate);
    } // console.log("picker set");

  } // if using time picker as well to select for time of the day.


  var el = document.getElementById("timepicker");

  if (el) {
    var $timeInput = $("#timepicker").pickatime();
    var timePicker = $timeInput.pickatime("picker");
    var minTime = [11, 00];
    var maxTime = [20, 00];
    timePicker.set("min", minTime);
    timePicker.set("max", maxTime);
  }
}
/*
copy text to clipBoard
*/


function copyToClipBoard(textValue) {
  if (textValue == "phoneNumber") {
    if (window.device == "mobile") {
      location.href = "tel:1-856-214-3413";
    }

    navigator.clipboard.writeText("8562143413").then(function () {
      alert("Copied phone number to clipboard");
    }, function () {
      console.log("failed to copy");
    });
  }
}
/*
Functions below are functions used to javascript page interaction for setting a new
*/


var setUpBackFromCart = function setUpBackFromCart() {
  if (sessionStorage.getItem("backFromCart")) {
    sessionStorage.removeItem("backFromCart");
    ["#top-message", "#event-planner", "#need-phone", "#next-button"].forEach(function (div) {
      $(div).empty();
    });
    window.selectedFoodOptions = JSON.parse(sessionStorage.getItem("otherSettings"));
    startSelectionScreen(selectedFoodOptions.max_Items, selectedFoodOptions.max_Flavors, selectedFoodOptions.help);
    window.eventVariables.numberOfPeople = JSON.parse(sessionStorage.getItem("people"));
    window.eventVariables.date = sessionStorage.getItem("date");
    window.foodCounter = JSON.parse(sessionStorage.getItem("foodCounter"));
    drawToSelection(Object.keys(window.foodCounter), window.selectedFoodOptions.Id, "");
  } else if (document.getElementById("main-planner-page")) {
    setPicker();
    planEvent();
  }
};
/*
 * plan event is an event listener that fires when the user selects in the date picker box
 *
 */


function planEvent() {
  var dateSelector = $("#datepicker");
  document.querySelector('input[name="date"]').onchange = changeEventHandler;
} // calling this function will get JSON data about the menu and other settings for building page


function initSettings(idOfMin) {
  // window.PageSettings = JSON.parse(sessionStorage.getItem("PageSettings"));
  // if (!PageSettings) {
  var params;
  $.getJSON($SCRIPT_ROOT + "/_get_menu", {}, function (data) {
    window.PageSettings = data;
    var menuSettings = JSON.stringify(data); // sessionStorage.setItem("PageSettings", menuSettings);

    $(idOfMin).append(data.minsize);

    if (window.editOrder) {
      startSelectionScreen();
      var checkOutButton = $("#checkoutButton");
      checkOutButton.html("Confirm Changes");
      checkOutButton.removeClass("col-xs-5").removeClass("col-sm-3").addClass("col-xs-12");
      checkOutButton.attr("onclick", "confirmChanges()");
    } else {
      setUpBackFromCart();
    }
  }); // }
}

initSettings("#min1");
/*
 SHUTDOWN OVER RIDE FOR DEVELOPMENT ONLY TAKE OUT BEFORE DEPOLOYMENT
*/

function shutDown(password) {
  $.post($SCRIPT_ROOT + "/shutdown?pw=" + password, {}, function (data, textStatus) {});
}
/*
 * here we simiply show the message on first screen that tells customer
 * to call if date not available or party is too small.
 */


function changeEventHandler(event) {
  if (!event.target.value) console.log("nothing here");else {
    var showPhone = $("#need-phone");

    if (showPhone.hasClass("hidden")) {
      showPhone.removeClass("hidden").addClass("fade-in-right");
    }
  }
  var nextButton = $("#next-button");

  if (nextButton.hasClass("hidden")) {
    var cssAnimationTiming = " -webkit-animation-duration: 2s; animation-duration: 2s";
    nextButton[0].setAttribute("style", cssAnimationTiming);
    nextButton.removeClass("hidden").addClass("fade-in-left");
  }
} // this function is called by the button an adds css stlying to give the animation
// effect on hovering over the next button


function arrowMove(idOfElement) {
  var next_Arrow = $(idOfElement);
  if (idOfElement.includes("next")) next_Arrow.css("padding-left", "14px");else next_Arrow.css("padding-right", "14px");
}

function arrowMoveBack(idOfElement) {
  var next_Arrow = $(idOfElement);
  if (idOfElement.includes("next")) next_Arrow.css("padding-left", "0px");else next_Arrow.css("padding-right", "0px");
}

var HOW_MANY_PEOPLE_DIV = '<div id="card2" class="col-md-6 col-md-offset-3 main-card fade-in-right">' + ' <h4 class="question-titles">How many people will be at your event?</h4>' + '<div class="form-group">' + '<h5 class="question-titles">Adults: <input name="adults" class="form-control" /></h5>' + "</div>" + '<div class="form-group">' + '<h5 class="question-titles">' + '&nbsp;&nbsp;&nbsp;&nbsp;Kids: <input name="kids" class="form-control" />' + "</h5>" + "</div>" + "</div>";
var BACK_BUTTON = '<div id="button2" style="-webkit-animation-duration: 1s; animation-duration: 1s;" class="col-xs-6 fade-in-left">' + "<button onclick=\"prevWindow('page1')\" onmouseout=\"arrowMoveBack('#back-arrow')\" onmouseover=\"arrowMove('#back-arrow')\"" + ' class="button button1"><span id="back-arrow" class="glyphicon glyphicon-menu-left"></span>  Back</button> </div>';
var NEXT_BUTTON = '<div id="button1" style="-webkit-animation-duration: 1s; animation-duration: 1s;" class="col-xs-6 fade-in-right">' + '<button onclick="nextWindow2()" onmouseout="arrowMoveBack(\'#next-arrow\')" onmouseover="arrowMove(\'#next-arrow\')" class="button button1">' + 'Next <span id="next-arrow" class="glyphicon glyphicon-menu-right"></span></button></div>';

function nextWindow() {
  // get the date value input from the calender and set it inside window, so can be called later.
  var eventDate = document.getElementById("datepicker").value;

  if (eventDate === "" || eventDate === "None") {
    return;
  }

  eventVariables.date = eventDate;
  savePageLayout("page1", ["#event-planner", "#need-phone", "#next-button"]);
  fadeOutSections(["#card2", "#card3", "#button1", "#card4"]);
  setTimeout(function () {
    ["#event-planner", "#need-phone", "#next-button"].forEach(function (div) {
      $(div).empty();
    });
    $("#event-planner").append(HOW_MANY_PEOPLE_DIV);
    $("#next-button").append(BACK_BUTTON + NEXT_BUTTON);
  }, 1000);
}

var saveNumberOfPeople = function saveNumberOfPeople(saveVariable, inputForAdults, inputForKids) {
  var adultsNum = document.querySelector(inputForAdults).value;
  adultsNum = adultsNum !== "" ? parseInt(adultsNum) : 0;
  var kidsNum = document.querySelector(inputForKids).value;
  kidsNum = kidsNum !== "" ? parseInt(kidsNum) : 0;
  var totalPeople = parseInt(adultsNum) + parseInt(kidsNum);
  window[saveVariable].numberOfPeople = {
    adults: adultsNum,
    kids: kidsNum
  };
  return totalPeople >= window.PageSettings.minsize;
};

var NOT_ENOUGH_PEOPLE_ERROR = '<div id="card3" class="col-md-6 col-md-offset-3 main-card fade-in-right"> <h4 class="question-titles">' + "The minimum number of people to reserve a catering event is " + "minsizePlaceHolder" + ", <br>" + "but let's see if we can help out. Give us a call </h4>" + '<a class="question-titles" href="tel:+1-856-214-3413">(856)-214-3413</a> </div>';

function nextWindow2() {
  savePageLayout("page2", ["#top-message", "#event-planner", "#next-button"]);
  /* get data within input forms, convert to Integer, if less than 8, show message */

  var isValidPeopleNum = saveNumberOfPeople("eventVariables", 'input[name="adults"]', 'input[name="kids"]');

  if (isValidPeopleNum) {
    fadeOutSections(["#card1", "#card2", "#card3", "#button1", "#button2", "#card4"]);
    setTimeout(function () {
      [$("#top-message"), $("#event-planner"), $("#need-phone"), $("#next-button")].forEach(function (div) {
        return div.empty();
      });
      /* Javascrip the third page into screen */

      setStep3();
    }, 1000); // if the warning message hasnt already been shown
  } else if (document.getElementById("card3") === null) {
    lessThanMin = NOT_ENOUGH_PEOPLE_ERROR.slice().replace("minsizePlaceHolder", window.PageSettings.minsize);
    $("#need-phone").append(lessThanMin);
  }
}

var ASK_IF_HELP_TOP = buildHelpTop();
var HELP_OR_NO_HELP = chooseIfHelpDiv();
var BACK_BUTTON2 = BACK_BUTTON.slice().replace("page1", "page2");

function buildHelpTop(){
    var outer_div = '<div id="card2" class="col-md-8 col-md-offset-2 main-card fade-in-right question-titles">';
    var top_header_A = "<h4> Not sure what's going to be the perfect amount to order for your event?</h4><h4> We'd love to help!</h4>";
    var top_header_B = "<h4>Based on the number of people, we can recommend how much food to get for your gathering.</h4>";
    var top_header_C = "<h4>To continue to the menu with help on your order size, click 'With amount help'.<br/> Otherwise, click 'Without amount help'.</h4>"
    var close_div = "</div>";
    return outer_div + top_header_A + top_header_B + top_header_C + close_div;
}
function chooseIfHelpDiv(){
    var outer_leftDiv = '<div onclick="setUpHelpScreen(\'nohelp\')" id="card3" class="choose-help-box card-margin1 col-md-4 col-md-offset-2 main-card fade-in-left">';
    var left_side = '<h4 class="question-titles"> Without amount help</h4>' + "</div>";
    var outer_rightDiv = '<div onclick="setUpHelpScreen(\'help\')" id="card4" class="choose-help-box card-margin2 col-md-4 main-card fade-in-right">';
    var right_side = '<h4 class="question-titles">With amount help</h4>' + "</div>";
    return outer_leftDiv + left_side + outer_rightDiv + right_side;
}
function setStep3() {
  $("#top-message").append(ASK_IF_HELP_TOP);
  $("#event-planner").append(HELP_OR_NO_HELP);
  $("#next-button").append(BACK_BUTTON2);
}
/* Start the help screen for selecting the items
   or menu seletion without help.
   If no help then call function startSelectionScreen */


function setUpHelpScreen(needHelp) {
  $("#card3").removeClass("choose-help-box");
  $("#card4").removeClass("choose-help-box");
  fadeOutSections(["#card2", "#card3", "#card4", "#next-button"]);
  setTimeout(function () {
    [$("#top-message"), $("#event-planner")].forEach(function (div) {
      return div.empty();
    });
    if (needHelp === "help") startHelpScreen();
    if (needHelp === "nohelp") startSelectionScreen();
  }, 1000);
}
/* *************************************************************************
   start menu selection screen
   window.selectedFoodOptions will keep track of the items chosen

*/


var HELPER_SCREEN_DIV = '<div id="card2" class="col-md-8 col-md-offset-2 main-card fade-in-left helper-screen question-titles">' + "helpPlaceHolder" + "<div class='row normalize-height'><div class='col-md-4'><h3 class='main-menu-headers' >" + "Entree Options</h3><div id='food-options' class='row'></div></div>" + "<div id='selected-food' class='col-md-8'><h3 class='main-menu-headers' >Selected Items</h3>" + "<div id='cardIdPlaceHolder' class='row'></div></div></div><div id='checkoutButton' onclick='proceedToCheckout(\"cardIdPlaceHolder\")'" + " class='button button1 checkout-button col-xs-5 col-sm-3'>Checkout</div></div>";

function startSelectionScreen() {
  var max_Items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 40;
  var max_Flavors = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultMaxFlavors;
  var help = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  if (!sessionStorage.getItem("backFromCart")) {
    window.selectedFoodOptions = {};
    window.selectedFoodOptions.Id = "my_cart";
    window.selectedFoodOptions.help = help;
    window.selectedFoodOptions.max_Items = max_Items;
    window.selectedFoodOptions.max_Flavors = max_Flavors; // window.my_cart = [];

    window.foodCounter = {};
    foodCounter.total = 0;
  }

  var helpDiv = help ? "<h4>Based on your party size, please select a total of " + max_Items + " items</h4>" : "";
  var HELPER_SCREEN = HELPER_SCREEN_DIV.slice().replace("helpPlaceHolder", helpDiv).replace("cardIdPlaceHolder", window.selectedFoodOptions.Id);
  $("#top-message").append(HELPER_SCREEN); // need to pass in the id of the entree div

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
  var entreeItems = window.PageSettings.entree;
  var categories = entreeItems.splice(-1);
  var sideItems = window.PageSettings.sides;
  var sideCategories = sideItems.splice(-1);
  var itemDictIndex;
  $.each(entreeItems, function (index, value) {
    insertDivToOptions(idOfEntreeDiv, index, value.item);
    window.itemDictionary[index] = value;
    itemDictIndex = index;
  });
  window.itemDictionary.sides = buildSidesDict(sideItems);
  insertSidesDiv("sides", idOfEntreeDiv);
}

var buildSidesDict = function buildSidesDict(listOfSides) {
  var newObject = {};
  var sidesDescription = "";
  var sidesOptions = "";
  var sidesSizes = "";
  listOfSides.forEach(function (value, index) {
    itemDictionary[value.item] = buildOptionsDict(value);
    sidesDescription += value.item + ": " + value.description + "<br/>";
    sidesOptions += value.item + ",";
  });
  newObject.item = "Side Choices";
  newObject.description = sidesDescription;
  sidesOptions = sidesOptions.slice(0, -1);
  newObject.sides = sidesOptions;
  return newObject;
};

var buildOptionsDict = function buildOptionsDict(dictionaryForItem) {
  var newObj = {};

  for (var key in dictionaryForItem) {
    if (key !== "description" && key !== "item") {
      if (dictionaryForItem.hasOwnProperty(key)) {
        var newList = dictionaryForItem[key].split(",");
        newList.forEach(function (element, index) {
          this[index] = element.trim();
        }, newList);
        newObj[key] = newList;
      }
    }
  }

  return newObj;
};

var ITEM_NAME_BUTTON = '<div id="indexPlaceholder" class="entree-options">' + '<div class="entree-item col-xs-12 col-sm-6 col-md-12 xClass" onclick="showSelection(\'indexPlaceholder\')">itemName</div></div>';

function insertSidesDiv(itemDictionaryKey, divId) {
  var buttonDiv = ITEM_NAME_BUTTON.replace(new RegExp("indexPlaceholder", "g"), itemDictionaryKey).replace("itemName", "Sides");
  $(divId).append(buttonDiv);
} // each of the entree items gets created on the page with this div element, show selection
// is called with the index of the item which can be used to get the key value pair of itemDictionary


function insertDivToOptions(idOfElement, index, item_name) {
  var translateClass = (index + 1) % 2 == 0 ? "shift-right" : "";
  var buttonDivToAppend = ITEM_NAME_BUTTON.replace(new RegExp("indexPlaceholder", "g"), index).replace("itemName", item_name).replace("xClass", translateClass);
  $(idOfElement).append(buttonDivToAppend);
}

var MODAL_DIV = '<div id="myModal" class="modal question-titles"><div class="modal-content main-card">' + '<span class="close">X</span>' + "contentPlaceHolder" + "</div></div>"; // Show slection parameter is the key for the value pair of itemdictionary. which was set as the index
// of the item.

function showSelection(itemDictIndex) {
  var itemSelection = window.itemDictionary[itemDictIndex]; // keep a tempory copy of the cart array to revert back to.

  var temp_cart_array = deepCopy(window[selectedFoodOptions.Id]);
  window.addItems = false; // keep a temporary copy of the foodCounter to revert back to if the modal is closed without confirming add items

  var temp_food_count = deepCopy(foodCounter); // the main modal screen with div class='modal-content' holding the content and data

  var modalContent; // console.log(itemSelection);

  if (itemDictIndex !== "sides") {
    modalContent = MODAL_DIV.slice().replace("contentPlaceHolder", getModalContent(itemSelection.item, itemSelection));
  } else {
    modalContent = MODAL_DIV.replace("contentPlaceHolder", getModalContent("Sides", itemSelection));
  }

  $("#event-planner").append(modalContent);
  var modal = document.getElementById("myModal");
  var openButton = document.getElementById(itemDictIndex.toString());
  var span = document.getElementsByClassName("close")[0];
  var done = document.getElementById("done"); // these define clicking actions for opening and closing the modal

  openButton.onclick = function () {
    modal.style.display = "block";

    if (itemDictIndex === "sides") {
      // console.log("jere");
      setSelectionForSide();
    }

    var ifItemExists = window.foodCounter[itemSelection.item];

    if (ifItemExists && ifItemExists.items && ifItemExists.items.length > 0) {
      drawToSelection([itemSelection.item], "modal-selection", pickNumberOfItemsMessage());
    }
  };

  span.onclick = function () {
    // if closed window without adding items, revert back to original cart.
    resetFoodCounterAndCart(temp_food_count);
    modal.style.display = "none";
    $("#event-planner").empty();
  };

  window.onclick = function (event) {
    if (event.target == modal) {
      // if closing without adding items, revert cart.
      resetFoodCounterAndCart(temp_food_count);
      modal.style.display = "none";
      $("#event-planner").empty();
    }
  };
}

var MAIN_MODAL_CONTENT = "<h4> ItemNamePlaceholder: </h4>" + "<h4> HeaderPlaceholder </h4>" + "<div class='selection row'> SelectionPlaceholder <div onclick='getWantedItem(getWantedParams)'" + "class='col-xs-2 col-xs-offset-8 add-select'>Add to cart</div></div>" + '<div class="row modal-add-to-order">Please Confirm Items: </div><div id="idPlaceholder"' + ' class="row"></div><div class="row"><div onclick="addSelectionToCart(addSelectionPlaceholder)"' + ' class="col-xs-2 col-xs-offset-3 add-select">Confirm Items</div></div>'; // getModalContent returns the content to appear inside the modal pop up

function getModalContent(itemName, itemSettings) {
  // console.log(itemSettings);
  var idForSelectedList = "modal-selection";
  var content = MAIN_MODAL_CONTENT.replace("ItemNamePlaceholder", itemSettings.item).replace("HeaderPlaceholder", getHeaderForModal(itemSettings)).replace("SelectionPlaceholder", getSelectionForItem(itemSettings));
  var getWantedParams = '"' + itemSettings.item + '", "' + idForSelectedList + '"';
  content = content.replace("getWantedParams", getWantedParams).replace("idPlaceholder", idForSelectedList);
  var addSelectionParams = "'selectedFoodOptions', '" + itemName + "'";
  content = content.replace("addSelectionPlaceholder", addSelectionParams);
  return content;
} // the top section of the modal


function getHeaderForModal(itemSettings) {
  var headerDiv = itemSettings.description;
  headerDiv += '<p class="please-select-from">Please choose from options:</p>';
  return headerDiv;
} // creates a selection div with all the key value properties available for that food item.


function getSelectionForItem(itemSettings) {
  var temp_Dictionary = deepCopy(itemSettings);
  var itemName = temp_Dictionary.item;
  delete temp_Dictionary.description;
  delete temp_Dictionary.item; //

  var content = "";

  for (var key in temp_Dictionary) {
    if (temp_Dictionary.hasOwnProperty(key) && temp_Dictionary[key].length > 1) {
      if (window.selectedFoodOptions.help && key === "sizes") {
        content = "<div class='col-sm-6 col-md-4'> 1 Order includes a " + helpSizeConversion[itemName] + " count </div>" + content;
      } else {
        content += getSelectDiv(key, temp_Dictionary[key].split(","));
      }
    }
  }

  if ("sides" in temp_Dictionary) {
    for (var key in temp_Dictionary) {
      content += '<div id="sideOptions"></div>';
    }
  }

  return content;
}

var trimKey = function trimKey(key) {
  if (key.slice(-1) == "s") {
    key = key.slice(0, -1);
  }

  return key;
}; // iterate throguth the values of the array and returns select, option element


function getSelectDiv(key, array) {
  key = trimKey(key);
  var content = beginSelectionDiv(key);
  $.each(array, function (index, value) {
    // value = value.replace(" ", "");
    content += getOptionDiv(key, value);
  });
  content += "</select></div>";
  return content;
}

var getOptionDiv = function getOptionDiv(key, value) {
  return "<option value='" + key + "'>" + value.trim() + "</option>";
};

var beginSelectionDiv = function beginSelectionDiv(key) {
  var content = "<div class='col-sm-6 col-md-4'> Choose " + key + " : ";

  if (key === "side") {
    return content += "<select id='selected-item' onchange='setSelectionForSide()' class='select-setting'>";
  } else {
    return content += "<select class='select-setting'>";
  }
};

var setSelectionForSide = function setSelectionForSide() {
  var optionVal = $("#selected-item option:selected")[0].text;
  var getOptions = itemDictionary[optionVal];
  var selectionDivs = getSelectionDivsForSide(getOptions);
  $("#sideOptions").html(selectionDivs);
};

var getSelectionDivsForSide = function getSelectionDivsForSide(sideDictionary) {
  var divString = "";

  for (var _key2 in sideDictionary) {
    divString += getSelectDiv(_key2, sideDictionary[_key2]);
  }

  return divString;
};

var PICK_NUMBER_MORE_ITEMS = '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1">( Select numberPlaceholder more items )</div>';

var pickNumberOfItemsMessage = function pickNumberOfItemsMessage() {
  if (selectedFoodOptions.help) {
    var numberOfItemsToPick = window.selectedFoodOptions.max_Items - window.foodCounter.total;
    return PICK_NUMBER_MORE_ITEMS.replace("numberPlaceholder", numberOfItemsToPick);
  } else {
    return "";
  }
}; // when Select item presed, get the key, value pairings for each of the selection options.


function getWantedItem(nameOfItem, cartId) {
  // console.log(nameOfItem);
  var $selected = $(".select-setting");
  var thisItem = {
    count: 1,
    name: nameOfItem
  };

  if (window.selectedFoodOptions.help && nameOfItem !== "Side Choices") {
    thisItem.portion = helpSizeConversion[nameOfItem] + " count";
  } // create object with key value pairs


  $.each($selected, function (index, value) {
    thisItem[$(value).find("option:selected").val().trim()] = $(value).find("option:selected").text().trim();
  }); // need to make deep copy;

  var new_Object = deepCopy(thisItem);
  var value = 1;

  if (nameOfItem === "Side Choices") {
    value = 0;
  }

  var message = getAddToCartError(new_Object, value); // if there was not error message and if append returns false, push to end of item_object array.

  if (!message) {
    appendOrAddItem(new_Object, 1); // let alreadyAdd = appendSelection(thisItem);
    // if (!alreadyAdd) window.allSelected.push(thisItem);

    if (window.selectedFoodOptions.help) {
      message = pickNumberOfItemsMessage();
    } else {
      message = "";
    }
  }

  drawToSelection([nameOfItem], cartId, message);
}
/*
  @ params the key for window that is an array of menu objects, and the item object updating the list with
  returns true if the item was already in the list, and the count was appened,
  returns false if the item was not in the array.
*/


function appendSelection(toAppend) {
  var elem = window.foodCounter[toAppend.name].find(function (item) {
    return equalsExcept(item, toAppend, ["count", "cost"]);
  });

  if (elem) {
    elem.count++;
  }

  return !!elem;
}

function allowMore() {
  $("#limit-message").empty();
  window.selectedFoodOptions.max_Items += 1;
}

var ADD_MORE_MESSAGE = '<span class="tooltiptext">' + "Based on your number of people, we recommend the current cart limit. <br/> " + "But you can click here to increase the size of your cart!" + "</span></div>";
var AT_ORDER_LIMIT_DIV = '<div id="limit-message"style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1">' + 'Currently at order limit <div onclick="allowMore()"class="button button1 want-more-button">Want to add to order?' + ADD_MORE_MESSAGE + "</div>";
var AT_FLAVOR_LIMIT_DIV = '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1"> Already at Max unique flavors for item</div>';

function getAddToCartError(item, action) {
  //
  var atOrderLimit = foodCounter.total + action > selectedFoodOptions.max_Items;
  var alreadyHasFlavor = foodCounter[item.name] && foodCounter[item.name].flavors.includes(item.flavor);
  var atFlavorLimit = foodCounter[item.name] && foodCounter[item.name].flavors.length === 4;

  if (atOrderLimit) {
    return AT_ORDER_LIMIT_DIV;
  } else if (!alreadyHasFlavor && atFlavorLimit) {
    return AT_FLAVOR_LIMIT_DIV;
  } // AddItem(item, action);


  return null;
}

function appendOrAddItem(toAppend, amount) {
  var changeTotal = amount;

  if (toAppend.name === "Side Choices") {
    changeTotal = 0;
  }

  if (!foodCounter.hasOwnProperty(toAppend.name)) {
    // come here if the item does not exist in counter yet, in this case, we will always be adding a new Dish/Flavor
    foodCounter[toAppend.name] = {
      flavors: [toAppend.flavor],
      items: [deepCopy(toAppend)]
    };
    foodCounter.total += changeTotal;
    return;
  }

  var idx = foodCounter[toAppend.name].items.findIndex(function (item) {
    return equalsExcept(toAppend, item, ["count", "cost"]);
  });
  var inCart = foodCounter[toAppend.name].items[idx];

  if (inCart) {
    // TODO: look up falsiness and truthiness
    inCart.count += amount;
    foodCounter.total += changeTotal;

    if (inCart.count <= 0) {
      foodCounter[toAppend.name].items.splice(idx, 1);
    }

    reconcileFlavors(toAppend.name);
  } else {
    if (!foodCounter[toAppend.name].flavors.includes(toAppend.flavor)) {
      foodCounter[toAppend.name].flavors.push(toAppend.flavor);
    }

    foodCounter[toAppend.name].items.push(toAppend);
    foodCounter.total += changeTotal;
  }
} // create a new flavor, array and add all the flavors found in the cart,
// so the flavors array consistently contains only the flavors and all of the flavors


function reconcileFlavors(item_name) {
  var temp_flavor_array = [];
  foodCounter[item_name].items.forEach(function (element) {
    if (!temp_flavor_array.includes(element.flavor)) temp_flavor_array.push(element.flavor);
  });
  foodCounter[item_name].flavors = temp_flavor_array;
}

var ITEM_HTML_FOR_LIST = '<div class="col-xs-12 col-sm-10 col-sm-offset-1"><span onclick="appendValue(appendValuePlaceholder, 1)"> ' + '+ </span> countPlaceholder <span onclick="appendValue(appendValuePlaceholder, -1)"> - </span>';

var getHtmlForItem = function getHtmlForItem(entreeName, index, cartId, valueDictionary, arrayOfItemNames) {
  var appendValueParams = "'" + entreeName + "', '" + index + "', '" + cartId + "', '" + arrayOfItemNames + "'";
  var newDiv = ITEM_HTML_FOR_LIST.replace(/appendValuePlaceholder/g, appendValueParams).replace("countPlaceholder", valueDictionary.count);

  for (key in valueDictionary) {
    if (key === "cost") newDiv += "<small style='float:right;margin-right:20px;'>" + valueDictionary[key] + "</small>,";else if (key != "count") newDiv += " " + valueDictionary[key] + ",";
  }

  return newDiv.slice(0, newDiv.length - 1) + "</div>";
};
/**
 * @ params the name of the window global object, and the key of that object.
 * iterate through the object at this key, getting the 2D array of the full order
 * create the list div with +  - option for the number of each item. uses the id stored in the
 * object as id of element to insert into.
 */


function drawToSelection(arrayOfItemNames, cartId, message) {
  // let itemsArray = window["foodCounter"];
  var itemsDiv = message;
  arrayOfItemNames.forEach(function (entreeItem) {
    var listOfSelectedItems = window.foodCounter[entreeItem];

    if (listOfSelectedItems && listOfSelectedItems.items) {
      listOfSelectedItems = listOfSelectedItems.items;
      listOfSelectedItems.forEach(function (selectedItem, index) {
        itemsDiv += getHtmlForItem(entreeItem, index, cartId, selectedItem, arrayOfItemNames);
      });
    }
  });
  $("#" + cartId).html(itemsDiv);
}

function appendValue(itemName, index, cartId, arrayOfItemNames, value) {
  // console.log(" appending", array_name, index, value, cartId);
  index = parseInt(index);
  value = parseInt(value);
  var errorValue = value;

  if (itemName === "Side Choices") {
    errorValue = 0;
  }

  var thisItemObject = window.foodCounter[itemName].items[index];
  var message = getAddToCartError(thisItemObject, errorValue);

  if (!message) {
    appendOrAddItem(thisItemObject, value);

    if (window.selectedFoodOptions.help) {
      message = pickNumberOfItemsMessage();
    } else {
      message = "";
    }
  }

  arrayOfItemNames = arrayOfItemNames.split(",");
  if (typeof setTotal === "function") setTotal("#cart-total");
  drawToSelection(arrayOfItemNames, cartId, message);
} // if addSelection to cart, push everything in allselected cart to main card, and set addItems ot true.


function addSelectionToCart(windowArray, itemName) {
  var allEntreeKeys = Object.keys(window.foodCounter);
  var $id = window.selectedFoodOptions.Id;
  drawToSelection(allEntreeKeys, $id, pickNumberOfItemsMessage());
  window.addItems = true;
  document.getElementsByClassName("close")[0].click();
}

function startHelpScreen() {
  // console.log("Help");
  var maxItems = Math.ceil((eventVariables.numberOfPeople.adults + eventVariables.numberOfPeople.kids) / parseInt(window.PageSettings.minsize));
  var maxFlavors = Math.min(maxItems, 4);
  startSelectionScreen(maxItems, maxFlavors, true);
}

function proceedToCheckout(myCart) {
  var itemCount = 0;
  var keys = Object.keys(foodCounter);

  for (var _i = 0, _keys = keys; _i < _keys.length; _i++) {
    var _key3 = _keys[_i];

    if (_key3 !== "total") {
      if (foodCounter[_key3].hasOwnProperty("items")) {
        itemCount += foodCounter[_key3].items.length;
      }
    }
  }

  if (itemCount === 0) {
    alert("There doesn't seem to be anything in your cart!");
    return;
  }

  var people = JSON.stringify(eventVariables.numberOfPeople);
  sessionStorage.setItem("people", people);
  sessionStorage.setItem("date", eventVariables.date);
  var foodCount = JSON.stringify(foodCounter);
  sessionStorage.setItem("foodCounter", foodCount);
  var otherSettings = JSON.stringify(selectedFoodOptions);
  sessionStorage.setItem("otherSettings", otherSettings); // if (sessionStorage.getItem("logged_in") == null) {

  location.href = "/confirmCart"; // } else {
  //   location.href = "";
  // }
}