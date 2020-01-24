'use strict';
function getVal(object, key, fallback) {
  if (object.hasOwnProperty(key)) {
    return object[key];
  } else if (object.hasOwnProperty(fallback)) {
    return object[fallback];
  } else {
    return 1;
  }
}

var foodCount = sessionStorage.getItem("foodCounter");
window.foodCounter = JSON.parse(foodCount);

var otherSettings = sessionStorage.getItem("otherSettings");
window.selectedFoodOptions = JSON.parse(otherSettings);

var size_rules = { "Half Pan": 2, "Full Pan": 4, '48 oz Container': 1.5 };
var countConversions = { "Taco Tray": 24, "Burrito Tray": 8, "Nacho Bar": 10, "Rotisserie Chicken": 10 };

// console.log(typeof(prices));
function convertPriced(listOfItemDicts) {
  var entreePrices = getVal(window.prices, "entrees");

  var total = 0;
  listOfItemDicts.forEach(function (value) {
    // console.log(value)
    var itemName = getVal(value, 'name');
    if (itemName == "Side Choices") {
      itemName = getVal(value, 'side');
    }
    var itemFlavor = getVal(value, "flavor");
    var itemPortion = getVal(value, "portion", "size");
    // console.log(itemPortion)
    // console.log(itemPortion)

    var countNumberInTray = getVal(countConversions, itemName);
    countNumberInTray *= getVal(size_rules, itemPortion);

    var numberOfThisItemInCart = getVal(value, "count");
    countNumberInTray *= numberOfThisItemInCart;

    var rulesForItem = getVal(entreePrices, itemName);

    var pricePerItemName = getVal(rulesForItem, itemFlavor, "default");

    countNumberInTray *= pricePerItemName;

    var multiplierForPortionSize = getVal(size_rules, itemPortion);
    value.cost = "$" + countNumberInTray.toFixed(2);
    total += countNumberInTray;
  });
  // console.log(total)
  return total;
}

function setTotal(targetId) {
  var priceData = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window.prices;

  var total = 0;

  var foodCounterKeys = Object.keys(foodCounter).filter(function (key) {
    return key !== 'total';
  });

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = foodCounterKeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var foodKey = _step.value;

      if (foodCounter.hasOwnProperty(foodKey)) {
        var itemsOfKey = foodCounter[foodKey].items;
        total += convertPriced(itemsOfKey);
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  $(targetId).html(" $" + total.toFixed(2));
}
/*
 SHUTDOWN OVER RIDE FOR DEVELOPMENT ONLY TAKE OUT BEFORE DEPOLOYMENT
*/
function shutDown(password) {
  $.post($SCRIPT_ROOT + "/shutdown?pw=" + password, {}, function (data, textStatus) {});
}
var refresh = function refresh() {
  sessionStorage.removeItem('CURRENT_PAGE');
};
['#home-logo', "#user_logged_in", '#new-reservation'].forEach(function (element) {
  $(element).on('click', function () {
    refresh();
  });
});

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
  });
  // }
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
};

// are o1 and o2 deep equal except for a single key
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
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  var areEqual = equals(o1, o2) || getDifference(JSON.stringify(o2Copy), JSON.stringify(o1Copy)).length == 0;
  // console.log(areEqual);
  return areEqual;
};

var savePageLayout = function savePageLayout(page, divIdArray) {
  window[page] = {};
  divIdArray.forEach(function (div) {
    window[page][div] = $(div).html();
  });
};

/***********************************************************************************
******************************************************************************************************************/
var HELPER_SCREEN_DIV = '<div id="card2" class="col-md-8 col-md-offset-2 main-card fade-in-left helper-screen lindo-purple">' + "helpPlaceHolder" + "<div class='row normalize-height'><div class='col-md-4'><h3 class='main-menu-headers' >" + "Entree Options</h3><div id='food-options' class='row'></div></div>" + "<div id='selected-food' class='col-md-8'><h3 class='main-menu-headers' >Selected Items</h3>" + "<div id='cardIdPlaceHolder' class='row'></div></div></div><div id='checkoutButton' onclick='proceedToCheckout(\"cardIdPlaceHolder\")'" + " class='button button1 checkout-button col-xs-5 col-sm-3'>Checkout</div></div>";

var ITEM_NAME_BUTTON = '<div id="indexPlaceholder" class="entree-options">' + '<div class="entree-item col-xs-12 col-sm-6 col-md-12 xClass" onclick="showSelection(\'indexPlaceholder\')">itemName</div></div>';

var ITEM_HTML_FOR_LIST = '<div class="row selected-item"><div class="item-count"><span onclick="appendValue(appendValuePlaceholder, 1)"> ' + '+ </span> countPlaceholder <span onclick="appendValue(appendValuePlaceholder, -1)"> - </span></div>';

/***********************************************************************************
******************************************************************************************************************/
/***********************************************************************************
******************************************************************************************************************/

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

var resetFoodCounterAndCart = function resetFoodCounterAndCart(savedCount) {
  if (window.addItems == false) {
    window.foodCounter = savedCount;
    // window[window.selectedFoodOptions["Id"]] = savedCart;
  }
};
// set up the window variables that can be used later. including
// getting whether the user is on a phone device or desktop.
window.defaultMaxFlavors = 4;
window.eventVariables = {};

window.device;

function getDevice() {
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    window.device = "mobile";
  } else {
    window.device = "desk";
  }
}
// get variable to use later about the size of the users screen.
var windowWidth = window.innerWidth;

function setPicker() {
  var selectDate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
  var disabled = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;

  // collect dates to disable for picker + check to see if element exists on page.
  var finalArrayOfDates = [];
  // earlier the list of dates to exclude are set in the element that is hidden with id of dates-to-hide
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
  }
  // make sure that the element with id datepicker is available,
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
    }
    // console.log("picker set");
  }
  // if using time picker as well to select for time of the day.
  // let el = document.getElementById("timepicker");
  // if (el) {
  //   var $timeInput = $("#timepicker").pickatime();
  //   var timePicker = $timeInput.pickatime("picker");
  //   let minTime = [11, 00];
  //   let maxTime = [20, 00];
  //   timePicker.set("min", minTime);
  //   timePicker.set("max", maxTime);
  // }
}
function arrowMove(idOfElement) {
  var next_Arrow = $(idOfElement);
  if (idOfElement.includes("next")) next_Arrow.css("padding-left", "14px");else next_Arrow.css("padding-right", "14px");
}
function arrowMoveBack(idOfElement) {
  var next_Arrow = $(idOfElement);
  if (idOfElement.includes("next")) next_Arrow.css("padding-left", "0px");else next_Arrow.css("padding-right", "0px");
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
    startSelectionScreen(window.selectedFoodOptions.max_Items, window.selectedFoodOptions.max_Flavors, window.selectedFoodOptions.help);
    window.eventVariables.numberOfPeople = JSON.parse(sessionStorage.getItem("people"));
    var message = window.selectedFoodOptions.help ? pickNumberOfItemsMessage() : "";
    window.eventVariables.date = sessionStorage.getItem("date");
    window.foodCounter = JSON.parse(sessionStorage.getItem("foodCounter"));
    drawToSelection(Object.keys(window.foodCounter), window.selectedFoodOptions.Id, message);
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
  var dateInput = document.querySelector('input[name="date"]');
  if (dateInput) {
    dateInput.onchange = changeEventHandler;
  }
}

/*
 * here we simiply show the message on first screen that tells customer
 * to call if date not available or party is too small.
 */
var MAIN_TIMING = '0.8';
var SET_TIME = 850;

function changeEventHandler(event) {
  if (!event.target.value) console.log("nothing here");else {
    var showPhone = $("#need-phone");
    if (showPhone.hasClass("hidden")) {
      showPhone.removeClass("hidden").addClass("fade-in-right");
    }
  }
  var nextButton = $("#next-button");
  if (nextButton.hasClass("hidden")) {
    var cssAnimationTiming = " -webkit-animation-duration: " + MAIN_TIMING + "s; animation-duration: " + MAIN_TIMING + "s";
    nextButton[0].setAttribute("style", cssAnimationTiming);
    nextButton.removeClass("hidden").addClass("fade-in-left");
  }
}
// this function is called by the button an adds css stlying to give the animation
// effect on hovering over the next button
// col-md-offset-3
var page1_A = '<div id="card1" class="col-md-12 main-card fade-in-right">' + '<h4 class="lindo-purple">Thanks for choosing Taco Lindo!</h4>' + '<h4 class="lindo-purple">Lets plan your event!</h4></div>';
var page1_B = '<div id="card2" class="lindo-purple col-md-12 main-card fade-in-left">' + '<h4>What day will your event be?</h4> <div id="date-form" class="form-group">' + '<input class="form-control" type="text" name="date" placeholder="None" id="datepicker" /> </div></div>';
var page1_C = '<div id="card3" class="col-md-12 main-card fade-in-right">' + '<h4 class="lindo-purple"> If planning an event for less than <span id="min1"></span> people or' + '</h4> <h4 class="lindo-purple"> If your date is unavailable, give us a call: </h4>' + '<a class="lindo-purple" href="tel:+1-856-214-3413">(856)-214-3413</a></div>';
var page1_D = '<div id="goNext" class="col-md-6 col-md-offset-3 fade-in-right">' + '<button onmouseout="arrowMoveBack(\'#next-arrow\')" onmouseover="arrowMove(\'#next-arrow\')" ' + 'class="button button1">Next <span id="next-arrow" class="glyphicon glyphicon-menu-right"></span></button></div>';

var page1ToInsertIds = ['#top-message', '#event-planner', '#need-phone', '#next-button'];
var page1Divs = [page1_A, page1_B, page1_C, page1_D];
var page1ToFade = ["#card2", "#card3", "#goNext", "#card4"];

function Page(list_of_ids, divs, fade_out_divs) {
  var _this = this;

  var prev_exception = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

  this.toInsert = list_of_ids;
  this.divs = divs;
  this.toFade = fade_out_divs;
  this.dontFadeToGoBack = prev_exception;
  this.callBack = null;
  this.nextPage = null;

  this.run = function () {
    var toEmpty = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    _this.toInsert.forEach(function (element, index) {
      $(element).html(_this.divs[index]);
    });

    _this.callBack();
  };

  this.exit = function () {
    var pageObject = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var toEmpty = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var prev = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;


    fadeOutSections(_this.toFade);

    setTimeout(function () {
      toEmpty.forEach(function (div) {
        $(div).empty();
        if (pageObject) {
          if (prev) {
            for (var _key2 in prev) {
              $(_key2).html(prev[_key2]);
            }
          }
          pageObject.run();
        }
      });
    }, SET_TIME);
  };
}

var page1 = new Page(page1ToInsertIds, page1Divs, page1ToFade);

page1.callBack = function () {

  setPicker(window.eventVariables.date);

  $('#goNext').on('click', function () {
    var eventDate = document.getElementById("datepicker").value;
    if (eventDate === "" || eventDate === "None") {
      return;
    }
    window.eventVariables.date = eventDate;
    page1.exit(page2, ["#event-planner", "#need-phone", "#next-button"]);
  });
};

if (!sessionStorage.getItem("backFromCart")) {
  if (!location.href.includes('edit_order')) {
    page1.run();
  }
}

var buildHelpTop = function buildHelpTop() {
  var outer_div = '<div id="card2" class="col-md-8 col-md-offset-2 main-card fade-in-right lindo-purple">';
  var top_header_A = "<h4> Not sure what's going to be the perfect amount to order for your event?</h4><h4> We'd love to help!</h4>";
  var top_header_B = "<h4>Based on the number of people, we can recommend how much food to get for your gathering.</h4>";
  var top_header_C = "<h4>To continue to the menu with help on your order size, click <span class='lindo-red'>'With amount help'.</span><br/> Otherwise, click 'Without help'.</h4>";
  var close_div = "</div>";
  return outer_div + top_header_A + top_header_B + top_header_C + close_div;
};
var chooseIfHelpDiv = function chooseIfHelpDiv() {
  var outer_leftDiv = '<div id="card3" class="choose-help-box card-margin1 col-md-4 col-md-offset-2 main-card fade-in-left">';
  var left_side = '<h4 class="lindo-purple"> Without help</h4>' + "</div>";
  var outer_rightDiv = '<div id="card4" class="choose-help-box card-margin2 col-md-4 main-card fade-in-right">';
  var right_side = '<h4 class="lindo-purple">With amount help</h4>' + "</div>";
  return outer_leftDiv + left_side + outer_rightDiv + right_side;
};
var ASK_IF_HELP_TOP = buildHelpTop();
var HELP_OR_NO_HELP = chooseIfHelpDiv();

var BACK_BUTTON = '<div id="button2" style="-webkit-animation-duration: ' + MAIN_TIMING + 's; animation-duration: ' + MAIN_TIMING + 's;" class="col-xs-6 fade-in-left">' + "<button id='goBack' onmouseout=\"arrowMoveBack('#back-arrow')\" onmouseover=\"arrowMove('#back-arrow')\"" + ' class="button button1"><span id="back-arrow" class="glyphicon glyphicon-menu-left"></span>  Back</button> </div>';

var BACK_BUTTON2 = BACK_BUTTON.slice().replace("page1", "page2");

var page3Ids = ["#top-message", "#event-planner", "#next-button"];
var page3Divs = [ASK_IF_HELP_TOP, HELP_OR_NO_HELP, BACK_BUTTON2];
var page3ToFade = ["#card2", "#card3", "#card4", "#goBack"];
var page3NotFade = [];
var page3 = new Page(page3Ids, page3Divs, page3ToFade, page3NotFade);

var NOT_ENOUGH_PEOPLE_ERROR = '<div id="card3" class="col-md-12 main-card fade-in-right"> <h4 class="lindo-purple">' + "The minimum number of people to reserve a catering event is " + "minsizePlaceHolder" + ", <br>" + "but let's see if we can help out. Give us a call </h4>" + '<a class="lindo-purple" href="tel:+1-856-214-3413">(856)-214-3413</a> </div>';

var HOW_MANY_PEOPLE_DIV = '<div id="card2" class="col-md-12 main-card fade-in-left">' + ' <h4 class="lindo-purple">How many people will be at your event?</h4>' + '<div class="form-group">' + '<h5 class="lindo-purple">Adults: <input name="adults" class="form-control" /></h5>' + "</div>" + '<div class="form-group">' + '<h5 class="lindo-purple">' + '&nbsp;&nbsp;&nbsp;&nbsp;Kids: <input name="kids" class="form-control" />' + "</h5>" + "</div>" + "</div>";

var NEXT_BUTTON = '<div id="button1" style="-webkit-animation-duration: ' + MAIN_TIMING + 's; animation-duration: ' + MAIN_TIMING + 's;" class="col-xs-6 fade-in-right">' + '<button id="goNext" onmouseout="arrowMoveBack(\'#next-arrow\')" onmouseover="arrowMove(\'#next-arrow\')" class="button button1">' + 'Next <span id="next-arrow" class="glyphicon glyphicon-menu-right"></span></button></div>';

page3.startExit = function () {
  $("#card3").removeClass("choose-help-box");
  $("#card4").removeClass("choose-help-box");
  page3.exit(null, ["#top-message", "#event-planner"]);
};
var prev_from_3 = { '#top-message': page1_A, '#next-button': BACK_BUTTON + NEXT_BUTTON };

page3.callBack = function () {
  $('#goBack').on('click', function () {
    page3.exit(page2, ['#top-message', '#event-planner', '#next-button'], prev_from_3);
  });
  $('#card4').on('click', function () {
    page3.startExit();
    setTimeout(function () {
      startHelpScreen();
    }, SET_TIME);
  });
  $('#card3').on('click', function () {
    page3.startExit();
    setTimeout(function () {
      startSelectionScreen();
    }, SET_TIME);
  });
};
var page2InsertIds = ["#event-planner", "#next-button"];
var page2Divs = [HOW_MANY_PEOPLE_DIV, BACK_BUTTON + NEXT_BUTTON];
var page2ToFade = ["#card1", "#card2", "#card3", "#goNext", "#goBack", "#card4", '#button1'];
var page2GoBackException = ['#card1', '#card3', '#card4'];

var page2 = new Page(page2InsertIds, page2Divs, page2ToFade, page2GoBackException);

page2.callBack = function () {
  if (window.eventVariables.numberOfPeople) {
    setInputs(['input[name="adults"]', 'input[name="kids"]'], [window.eventVariables.numberOfPeople.adults, window.eventVariables.numberOfPeople.kids]);
  }
  $('#goBack').on('click', function () {
    page2.exit(page1, ["#event-planner", "#need-phone", "#next-button"]);
  });

  $('#goNext').on('click', function () {
    var isValidPeopleNum = saveNumberOfPeople("eventVariables", 'input[name="adults"]', 'input[name="kids"]');

    if (isValidPeopleNum) {
      sessionStorage.setItem('CURRENT_PAGE', '3');
      page2.exit(page3, ["#top-message", "#event-planner", "#need-phone", "#next-button"]);
      // setTimeout(() => {$('#next-button').removeClass('fade-out-right')}, 1050)
    } else if (document.getElementById("card3") === null) {
      var lessThanMin = NOT_ENOUGH_PEOPLE_ERROR.slice().replace("minsizePlaceHolder", window.PageSettings.minsize);
      $("#need-phone").append(lessThanMin);
    }
  });
};

var saveNumberOfPeople = function saveNumberOfPeople(saveVariable, inputForAdults, inputForKids) {
  var adultsNum = document.querySelector(inputForAdults).value;
  adultsNum = adultsNum !== "" ? parseInt(adultsNum) : 0;

  var kidsNum = document.querySelector(inputForKids).value;
  kidsNum = kidsNum !== "" ? parseInt(kidsNum) : 0;

  var totalPeople = parseInt(adultsNum) + parseInt(kidsNum);

  window[saveVariable].numberOfPeople = { adults: adultsNum, kids: kidsNum };

  return totalPeople >= window.PageSettings.minsize;
};

/* *************************************************************************
   start menu selection screen
   window.selectedFoodOptions will keep track of the items chosen

*/
var MODAL_DIV = '<div id="myModal" class="modal lindo-purple"><div class="modal-content main-card">' + '<span class="close">X</span>' + "contentPlaceHolder" + "</div></div>";
var MAIN_MODAL_CONTENT = "<h4> ItemNamePlaceholder: </h4>" + "<h4> HeaderPlaceholder </h4>" + "<div class='selection row'> SelectionPlaceholder <div onclick='getWantedItem(getWantedParams)'" + "class='row add-select'>Add to cart</div></div>" + '<div class="row modal-add-to-order">namePlaceholder\'s in your cart: </div><div id="idPlaceholder"' + ' class="row"></div><div class="button button1" id="done-selection">Done</div>';

var ADD_MORE_MESSAGE = '<span class="tooltiptext">' + "Based on your number of people, we recommend the current cart limit. <br/> " + "But you can click here to increase the size of your cart!" + "</span></div>";

var AT_ORDER_LIMIT_DIV = '<div id="limit-message" style="margin-right: 0px;" class="row lindo-red">' + 'Currently at order limit <div onclick="allowMore()"class="button button1 want-more-button">Want to add to order?' + ADD_MORE_MESSAGE + "</div>";

var AT_FLAVOR_LIMIT_DIV = '<div style="margin-right: 0px;"  class="row lindo-red"> Already at Max unique flavors for item</div>';

function startSelectionScreen() {
  var max_Items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 40;
  var max_Flavors = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window.defaultMaxFlavors;
  var help = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  if (!sessionStorage.getItem("backFromCart")) {
    window.selectedFoodOptions = {};
    window.selectedFoodOptions["Id"] = "my_cart";
    window.selectedFoodOptions.help = help;
    window.selectedFoodOptions["max_Items"] = max_Items;
    window.selectedFoodOptions["max_Flavors"] = max_Flavors;

    // window.my_cart = [];

    window.foodCounter = {};
    window.foodCounter["total"] = 0;
  }
  var helpDiv = help ? "<h4>Based on your party size, please select a total of " + max_Items + " items</h4>" : "";

  var HELPER_SCREEN = HELPER_SCREEN_DIV.slice().replace("helpPlaceHolder", helpDiv).replace("cardIdPlaceHolder", window.selectedFoodOptions["Id"]);

  $("#top-message").append(HELPER_SCREEN);

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

  var entreeItems = window.PageSettings["entree"];
  var categories = entreeItems.splice(-1);

  var sideItems = window.PageSettings["sides"];
  var sideCategories = sideItems.splice(-1);
  var itemDictIndex = void 0;

  $.each(entreeItems, function (index, value) {
    insertDivToOptions(idOfEntreeDiv, index, value.item);
    window.itemDictionary[index] = value;
    itemDictIndex = index;
  });

  window.itemDictionary["sides"] = buildSidesDict(sideItems);
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

function insertSidesDiv(itemDictionaryKey, divId) {
  var buttonDiv = ITEM_NAME_BUTTON.replace(new RegExp("indexPlaceholder", "g"), itemDictionaryKey).replace("itemName", "Sides");
  $(divId).append(buttonDiv);
}
// each of the entree items gets created on the page with this div element, show selection
// is called with the index of the item which can be used to get the key value pair of itemDictionary
function insertDivToOptions(idOfElement, index, item_name) {
  var translateClass = (index + 1) % 2 == 0 ? "shift-right" : "";
  var buttonDivToAppend = ITEM_NAME_BUTTON.replace(new RegExp("indexPlaceholder", "g"), index).replace("itemName", item_name).replace("xClass", translateClass);
  $(idOfElement).append(buttonDivToAppend);
}

// Show slection parameter is the key for the value pair of itemdictionary. which was set as the index
// of the item.
function showSelection(itemDictIndex) {
  var itemSelection = window.itemDictionary[itemDictIndex];

  // keep a tempory copy of the cart array to revert back to.
  var temp_cart_array = deepCopy(window[selectedFoodOptions["Id"]]);

  window.addItems = false;

  // keep a temporary copy of the foodCounter to revert back to if the modal is closed without confirming add items
  // var temp_food_count = deepCopy(window.foodCounter);

  // the main modal screen with div class='modal-content' holding the content and data
  var modalContent = void 0;
  // console.log(itemSelection);
  if (itemDictIndex !== "sides") {
    modalContent = MODAL_DIV.slice().replace("contentPlaceHolder", getModalContent(itemSelection.item, itemSelection));
  } else {
    modalContent = MODAL_DIV.replace("contentPlaceHolder", getModalContent("Sides", itemSelection));
  }

  $("#event-planner").append(modalContent);

  var modal = document.getElementById("myModal");
  var openButton = document.getElementById(itemDictIndex.toString());
  var span = document.getElementsByClassName("close")[0];
  var done = document.getElementById("done-selection");
  // these define clicking actions for opening and closing the modal
  openButton.onclick = function () {
    modal.style.display = "block";
    if (itemDictIndex === "sides") {
      // console.log("jere");
      setSelectionForSide();
    }
    var ifItemExists = window["foodCounter"][itemSelection.item];
    if (ifItemExists && ifItemExists["items"] && ifItemExists["items"].length > 0) {
      drawToSelection([itemSelection.item], "modal-selection", pickNumberOfItemsMessage());
    }
  };
  span.onclick = function () {
    // if closed window without adding items, revert back to original cart.
    // resetFoodCounterAndCart(temp_food_count);
    addSelectionToCart("", itemSelection.item);
    modal.style.display = "none";
    $("#event-planner").empty();
  };
  done.onclick = function () {
    span.click();
  };
  window.onclick = function (event) {
    if (event.target == modal) {
      // if closing without adding items, revert cart.
      // resetFoodCounterAndCart(temp_food_count);
      span.click();
    }
  };
}

// getModalContent returns the content to appear inside the modal pop up
function getModalContent(itemName, itemSettings) {
  // console.log(itemSettings);
  var idForSelectedList = "modal-selection";
  var content = MAIN_MODAL_CONTENT.replace("ItemNamePlaceholder", itemSettings.item).replace("HeaderPlaceholder", getHeaderForModal(itemSettings)).replace("SelectionPlaceholder", getSelectionForItem(itemSettings));

  var getWantedParams = '"' + itemSettings.item + '", "' + idForSelectedList + '"';

  content = content.replace("getWantedParams", getWantedParams).replace("idPlaceholder", idForSelectedList);

  content = content.replace("namePlaceholder", itemSettings.item);

  return content;
}

// the top section of the modal
function getHeaderForModal(itemSettings) {
  var headerDiv = itemSettings.description;
  headerDiv += '<p class="please-select-from">Please choose from options:</p>';
  return headerDiv;
}
// creates a selection div with all the key value properties available for that food item.
function getSelectionForItem(itemSettings) {
  var temp_Dictionary = deepCopy(itemSettings);
  var itemName = temp_Dictionary.item;
  delete temp_Dictionary["description"];
  delete temp_Dictionary["item"];
  //
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
};

// iterate throguth the values of the array and returns select, option element
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
  var content = "<div class='col-sm-12 col-md-4 order-option'> Choose " + key + " : ";
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
  for (var _key3 in sideDictionary) {
    divString += getSelectDiv(_key3, sideDictionary[_key3]);
  }
  return divString;
};

var PICK_NUMBER_MORE_ITEMS = '<div style="margin-right: 0px;" class="row lindo-red">( Select numberPlaceholder more items )</div>';

var pickNumberOfItemsMessage = function pickNumberOfItemsMessage() {
  if (selectedFoodOptions.help) {
    var numberOfItemsToPick = window.selectedFoodOptions["max_Items"] - window.foodCounter.total;
    return PICK_NUMBER_MORE_ITEMS.replace("numberPlaceholder", numberOfItemsToPick);
  } else {
    return "";
  }
};

// when Select item presed, get the key, value pairings for each of the selection options.
function getWantedItem(nameOfItem, cartId) {
  // console.log(nameOfItem);
  var $selected = $(".select-setting");
  var thisItem = { count: 1, name: nameOfItem };
  if (window.selectedFoodOptions.help && nameOfItem !== "Side Choices") {
    thisItem["portion"] = helpSizeConversion[nameOfItem] + " count";
  }
  // create object with key value pairs
  $.each($selected, function (index, value) {
    thisItem[$(value).find("option:selected").val().trim()] = $(value).find("option:selected").text().trim();
  });

  // need to make deep copy;
  var new_Object = deepCopy(thisItem);
  var value = 1;
  if (nameOfItem === "Side Choices") {
    value = 0;
  }
  var message = getAddToCartError(new_Object, value);
  // if there was not error message and if append returns false, push to end of item_object array.
  if (!message) {
    appendOrAddItem(new_Object, 1);
    // let alreadyAdd = appendSelection(thisItem);
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
  var elem = window["foodCounter"][toAppend.name].find(function (item) {
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

function getAddToCartError(item, action) {
  //
  var atOrderLimit = window.foodCounter.total + action > window.selectedFoodOptions.max_Items;

  var alreadyHasFlavor = window.foodCounter[item.name] && window.foodCounter[item.name].flavors.includes(item.flavor);

  var atFlavorLimit = window.foodCounter[item.name] && window.foodCounter[item.name].flavors.length === 4;

  if (atOrderLimit) {
    return AT_ORDER_LIMIT_DIV;
  } else if (!alreadyHasFlavor && atFlavorLimit) {
    return AT_FLAVOR_LIMIT_DIV;
  }

  // AddItem(item, action);
  return null;
}

function appendOrAddItem(toAppend, amount) {
  var changeTotal = amount;
  if (toAppend.name === "Side Choices") {
    changeTotal = 0;
  }
  if (!window.foodCounter.hasOwnProperty(toAppend.name)) {
    // come here if the item does not exist in counter yet, in this case, we will always be adding a new Dish/Flavor
    window.foodCounter[toAppend.name] = {
      flavors: [toAppend.flavor],
      items: [deepCopy(toAppend)]
    };
    window.foodCounter["total"] += changeTotal;
    return;
  }

  var idx = window.foodCounter[toAppend.name]["items"].findIndex(function (item) {
    return equalsExcept(toAppend, item, ["count", "cost"]);
  });
  var inCart = window.foodCounter[toAppend.name]["items"][idx];

  if (inCart) {
    // TODO: look up falsiness and truthiness
    inCart.count += amount;
    window.foodCounter["total"] += changeTotal;
    if (inCart.count <= 0) {
      window.foodCounter[toAppend.name]["items"].splice(idx, 1);
    }
    reconcileFlavors(toAppend.name);
  } else {
    if (!window.foodCounter[toAppend.name].flavors.includes(toAppend.flavor)) {
      window.foodCounter[toAppend.name].flavors.push(toAppend.flavor);
    }
    window.foodCounter[toAppend.name]["items"].push(toAppend);
    window.foodCounter["total"] += changeTotal;
  }
}

// create a new flavor, array and add all the flavors found in the cart,
// so the flavors array consistently contains only the flavors and all of the flavors
function reconcileFlavors(item_name) {
  var temp_flavor_array = [];
  window.foodCounter[item_name].items.forEach(function (element) {
    if (!temp_flavor_array.includes(element.flavor)) temp_flavor_array.push(element.flavor);
  });
  window.foodCounter[item_name].flavors = temp_flavor_array;
}

var getHtmlForItem = function getHtmlForItem(entreeName, index, cartId, valueDictionary, arrayOfItemNames) {
  var appendValueParams = "'" + entreeName + "', '" + index + "', '" + cartId + "', '" + arrayOfItemNames + "'";
  var toRemove = 8;
  var newDiv = ITEM_HTML_FOR_LIST.replace(/appendValuePlaceholder/g, appendValueParams).replace("countPlaceholder", valueDictionary.count) + "<div>";
  var costDiv = "";
  for (var key in valueDictionary) {
    if (key === "cost") {
      costDiv = "<div class='cost-div'>" + valueDictionary[key] + "</div>";
    }else if (key != "count") {
      newDiv += "<div class='selected-key'> " + valueDictionary[key] + ", </div>";
    }
  }
  return newDiv.slice(0, newDiv.length - 8) + "</div></div>" + costDiv +"</div>";
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
    var listOfSelectedItems = window["foodCounter"][entreeItem];

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

  var thisItemObject = window["foodCounter"][itemName]["items"][index];

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

  if (document.getElementById('cart-total')) {
    setTotal("#cart-total");
  }
  drawToSelection(arrayOfItemNames, cartId, message);
}

// if addSelection to cart, push everything in allselected cart to main card, and set addItems ot true.
function addSelectionToCart(windowArray, itemName) {
  var allEntreeKeys = Object.keys(window.foodCounter);

  var $id = window.selectedFoodOptions.Id;
  drawToSelection(allEntreeKeys, $id, pickNumberOfItemsMessage());
  window.addItems = true;
  document.getElementsByClassName("close")[0].click();
}

function startHelpScreen() {
  // console.log("Help");
  var numGuests = 0;
  var numKids = window.eventVariables.numberOfPeople.kids;
  var numAdults = window.eventVariables.numberOfPeople.adults;
  if (numKids + numAdults >= 8 && 0.5 * numKids + numAdults < 8) {
    numGuests = 8;
  } else {
    numGuests = 0.5 * numKids + numAdults;
  }
  var maxItems = Math.ceil(numGuests / parseInt(window.PageSettings.minsize));
  var maxFlavors = Math.min(maxItems, 4);

  startSelectionScreen(maxItems, maxFlavors, true);
}
// calling this function will get JSON data about the menu and other settings for building page
function initSettings(idOfMin) {
  var settings = sessionStorage.getItem("PageSettings");

  if (settings === null) {
    $.get("/_get_menu", {}, function (data) {
      window.PageSettings = data;
      sessionStorage.setItem("PageSettings", JSON.stringify(data));
      $(idOfMin).append(data.minsize);
    });
  } else {
    window.PageSettings = JSON.parse(settings);
  }if (window.editOrder) {
    startSelectionScreen();
    var checkOutButton = $("#checkoutButton");
    checkOutButton.html("Confirm Changes");
    checkOutButton.removeClass("col-xs-5").removeClass("col-sm-3").addClass("col-xs-12");
    checkOutButton.attr("onclick", "confirmChanges()");
  } else {
    setUpBackFromCart();
  }

  // }
}

initSettings("#min1");

function proceedToCheckout(myCart) {
  var itemCount = 0;
  var keys = Object.keys(window.foodCounter);
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = keys[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var _key4 = _step2.value;

      if (_key4 !== "total") {
        if (window.foodCounter[_key4].hasOwnProperty("items")) {
          itemCount += window.foodCounter[_key4].items.length;
        }
      }
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  if (itemCount === 0) {
    alert("There doesn't seem to be anything in your cart!");
    return;
  }
  var people = JSON.stringify(window.eventVariables.numberOfPeople);
  sessionStorage.setItem("people", people);

  sessionStorage.setItem("date", window.eventVariables.date);

  var foodCount = JSON.stringify(window.foodCounter);
  sessionStorage.setItem("foodCounter", foodCount);

  var otherSettings = JSON.stringify(window.selectedFoodOptions);
  sessionStorage.setItem("otherSettings", otherSettings);

  // if (sessionStorage.getItem("logged_in") == null) {
  location.href = "/confirmCart#order-summary";
  // } else {
  //   location.href = "";
  // }
}
