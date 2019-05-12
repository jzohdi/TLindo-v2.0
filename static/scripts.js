/*
 SHUTDOWN OVER RIDE FOR DEVELOPMENT ONLY TAKE OUT BEFORE DEPOLOYMENT
*/
function shutDown(password) {
  $.post($SCRIPT_ROOT + "/shutdown?pw=" + password, {}, function(
    data,
    textStatus
  ) {});
}
const refresh = () => {
 sessionStorage.removeItem('CURRENT_PAGE');
}
['#home-logo', "#user_logged_in", '#new-reservation'].forEach((element)=>{
  $(element).on('click', () => { refresh(); });
});

const helpSizeConversion = {
  "Taco Tray": 24,
  "Burrito Tray": 8,
  "Nacho Bar": 10,
  "Rotisserie Chicken": 10
};

const setPrices = function() {
  // const pricesString = sessionStorage.getItem("entree_prices");
  // if (typeof pricesString != typeof "string") {
  $.get("/get_prices/", function(data) {
    sessionStorage.setItem("entree_prices", JSON.stringify(data));
  });
  // }
};

setPrices();

const printf = content => {
  console.log(content);
};
const deepCopy = o => JSON.parse(JSON.stringify(o));

const equals = (o1, o2) => JSON.stringify(o1) === JSON.stringify(o2);
const getDifference = function(a, b) {
  var i = 0;
  var j = 0;
  var result = "";

  while (j < b.length) {
    if (a[i] != b[j] || i == a.length) result += b[j];
    else i++;
    j++;
  }
  return result;
};

// are o1 and o2 deep equal except for a single key
const equalsExcept = (o1, o2, keys) => {
  const o1Copy = deepCopy(o1);
  const o2Copy = deepCopy(o2);
  for (const key of keys) {
    delete o1Copy[key];
    delete o2Copy[key];
  }

  const areEqual =
    equals(o1, o2) ||
    getDifference(JSON.stringify(o2Copy), JSON.stringify(o1Copy)).length == 0;
  // console.log(areEqual);
  return areEqual;
};

const savePageLayout = (page, divIdArray) => {
  window[page] = {};
  divIdArray.forEach(div => {
    window[page][div] = $(div).html();
  });
};


/***********************************************************************************
******************************************************************************************************************/
const HELPER_SCREEN_DIV =
  '<div id="card2" class="col-md-8 col-md-offset-2 main-card fade-in-left helper-screen question-titles">' +
  "helpPlaceHolder" +
  "<div class='row normalize-height'><div class='col-md-4'><h3 class='main-menu-headers' >" +
  "Entree Options</h3><div id='food-options' class='row'></div></div>" +
  "<div id='selected-food' class='col-md-8'><h3 class='main-menu-headers' >Selected Items</h3>" +
  "<div id='cardIdPlaceHolder' class='row'></div></div></div><div id='checkoutButton' onclick='proceedToCheckout(\"cardIdPlaceHolder\")'" +
  " class='button button1 checkout-button col-xs-5 col-sm-3'>Checkout</div></div>";


const ITEM_NAME_BUTTON =
  '<div id="indexPlaceholder" class="entree-options">' +
  '<div class="entree-item col-xs-12 col-sm-6 col-md-12 xClass" onclick="showSelection(\'indexPlaceholder\')">itemName</div></div>';

const ITEM_HTML_FOR_LIST =
  '<div class="col-xs-12 col-sm-10 col-sm-offset-1"><span onclick="appendValue(appendValuePlaceholder, 1)"> ' +
  '+ </span> countPlaceholder <span onclick="appendValue(appendValuePlaceholder, -1)"> - </span>';

/***********************************************************************************
******************************************************************************************************************/
/***********************************************************************************
******************************************************************************************************************/

const setInputs = (arrayOfInputElements, arrayOfValues) => {
  arrayOfInputElements.forEach((element, index) => {
    $(element).val(arrayOfValues[index]);
  });
};

function fadeOutSections(other = []) {
  let count = 0;
  other.forEach(element => {
    $(element).addClass(count % 2 == 0 ? "fade-out-right" : "fade-out-left");

    count++;
  });
}

const resetFoodCounterAndCart = savedCount => {
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

function setPicker(selectDate = undefined, disabled = undefined) {
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
  if (disabled != undefined) {
    finalArrayOfDates = JSON.parse(disabled);
    finalArrayOfDates.forEach(function(val, index) {
      finalArrayOfDates[index] = new Date(val);
    });
  }
  // make sure that the element with id datepicker is available,
  // TODO // ? pass ID in as parameter
  // console.log(finalArrayOfDates);
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
  let next_Arrow = $(idOfElement);
  if (idOfElement.includes("next")) next_Arrow.css("padding-left", "14px");
  else next_Arrow.css("padding-right", "14px");
}
function arrowMoveBack(idOfElement) {
  let next_Arrow = $(idOfElement);
  if (idOfElement.includes("next")) next_Arrow.css("padding-left", "0px");
  else next_Arrow.css("padding-right", "0px");
}
/*
copy text to clipBoard
*/
function copyToClipBoard(textValue) {
  if (textValue == "phoneNumber") {
    if (window.device == "mobile") {
      location.href = "tel:1-856-214-3413";
    }
    navigator.clipboard.writeText("8562143413").then(
      function() {
        alert("Copied phone number to clipboard");
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
const setUpBackFromCart = function() {
  if (sessionStorage.getItem("backFromCart")) {
    sessionStorage.removeItem("backFromCart");
    ["#top-message", "#event-planner", "#need-phone", "#next-button"].forEach(
      function(div) {
        $(div).empty();
      }
    );

    window.selectedFoodOptions = JSON.parse(
      sessionStorage.getItem("otherSettings")
    );
    startSelectionScreen(
      window.selectedFoodOptions.max_Items,
      window.selectedFoodOptions.max_Flavors,
      window.selectedFoodOptions.help
    );
    window.eventVariables.numberOfPeople = JSON.parse(
      sessionStorage.getItem("people")
    );
    const message = ( window.selectedFoodOptions.help ) ? pickNumberOfItemsMessage() : "";
    window.eventVariables.date = sessionStorage.getItem("date");
    window.foodCounter = JSON.parse(sessionStorage.getItem("foodCounter"));
    drawToSelection(
      Object.keys(window.foodCounter),
      window.selectedFoodOptions.Id,
      message
    );
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
  let dateSelector = $("#datepicker");
  const dateInput = document.querySelector('input[name="date"]');
  if ( dateInput ){
    dateInput.onchange = changeEventHandler;
  }
}

/*
 * here we simiply show the message on first screen that tells customer
 * to call if date not available or party is too small.
 */
const MAIN_TIMING = '0.8';
const SET_TIME = 850;

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
      " -webkit-animation-duration: " + MAIN_TIMING + "s; animation-duration: "+ MAIN_TIMING + "s";
    nextButton[0].setAttribute("style", cssAnimationTiming);
    nextButton.removeClass("hidden").addClass("fade-in-left");
  }
}
// this function is called by the button an adds css stlying to give the animation
// effect on hovering over the next button
// col-md-offset-3
const page1_A = '<div id="card1" class="col-md-12 main-card fade-in-right">' +
      '<h4 class="question-titles">Thanks for choosing Taco Lindo!</h4>' +
      '<h4 class="question-titles">Lets plan your event!</h4></div>';
const page1_B = '<div id="card2" class="question-titles col-md-12 main-card fade-in-left">' +
    '<h4>What day will your event be?</h4> <div id="date-form" class="form-group">' +
    '<input class="form-control" type="text" name="date" placeholder="None" id="datepicker" /> </div></div>';
const page1_C = '<div id="card3" class="col-md-12 main-card fade-in-right">' +
    '<h4 class="question-titles"> If planning an event for less than <span id="min1"></span> people or' +
    '</h4> <h4 class="question-titles"> If your date is unavailable, give us a call: </h4>' +
    '<a class="question-titles" href="tel:+1-856-214-3413">(856)-214-3413</a></div>';
const page1_D = '<div id="goNext" class="col-md-6 col-md-offset-3 fade-in-right">' +
  '<button onmouseout="arrowMoveBack(\'#next-arrow\')" onmouseover="arrowMove(\'#next-arrow\')" '+
  'class="button button1">Next <span id="next-arrow" class="glyphicon glyphicon-menu-right"></span></button></div>';

const page1ToInsertIds = ['#top-message', '#event-planner', '#need-phone', '#next-button'];
const page1Divs = [page1_A, page1_B, page1_C, page1_D];
const page1ToFade = ["#card2", "#card3", "#goNext", "#card4"];

function Page( list_of_ids, divs, fade_out_divs, prev_exception = [] ){
  this.toInsert = list_of_ids
  this.divs = divs;
  this.toFade = fade_out_divs;
  this.dontFadeToGoBack = prev_exception;
  this.callBack = null;
  this.nextPage = null;

  this.run = (toEmpty = [] ) => {
    this.toInsert.forEach( (element, index) => {
      $(element).html( this.divs[index] );
    })

    this.callBack();
  }

  this.exit = ( pageObject = null, toEmpty = [], prev = null ) => {

    fadeOutSections(this.toFade);

    setTimeout(function() {
        toEmpty.forEach(function(div) {
         $(div).empty();
         if( pageObject ){
            if( prev ){
              for ( const key in prev ){
                $(key).html(prev[key]);
              }
            }
           pageObject.run();

         }
     });
  }, SET_TIME);
  }

}

const page1 = new Page(page1ToInsertIds, page1Divs, page1ToFade );

page1.callBack = () => {

  setPicker(window.eventVariables.date);

  $('#goNext').on('click', () => {
    const eventDate = document.getElementById("datepicker").value;
    if (eventDate === "" || eventDate === "None") { return; }
    window.eventVariables.date = eventDate;
    page1.exit( page2, ["#event-planner", "#need-phone", "#next-button"] );
  })

}

if ( !sessionStorage.getItem("backFromCart") ){
  if ( !location.href.includes('edit_order')){
     page1.run();
  }
}

const buildHelpTop = () => {
    const outer_div = '<div id="card2" class="col-md-8 col-md-offset-2 main-card fade-in-right question-titles">';
    const top_header_A = "<h4> Not sure what's going to be the perfect amount to order for your event?</h4><h4> We'd love to help!</h4>";
    const top_header_B = "<h4>Based on the number of people, we can recommend how much food to get for your gathering.</h4>";
    const top_header_C = "<h4>To continue to the menu with help on your order size, click 'With amount help'.<br/> Otherwise, click 'Without amount help'.</h4>"
    const close_div = "</div>";
    return outer_div + top_header_A + top_header_B + top_header_C + close_div;
}
const chooseIfHelpDiv = () => {
    const outer_leftDiv = '<div id="card3" class="choose-help-box card-margin1 col-md-4 col-md-offset-2 main-card fade-in-left">';
    const left_side = '<h4 class="question-titles"> Without amount help</h4>' + "</div>";
    const outer_rightDiv = '<div id="card4" class="choose-help-box card-margin2 col-md-4 main-card fade-in-right">';
    const right_side = '<h4 class="question-titles">With amount help</h4>' + "</div>";
    return outer_leftDiv + left_side + outer_rightDiv + right_side;
}
const ASK_IF_HELP_TOP = buildHelpTop();
const HELP_OR_NO_HELP = chooseIfHelpDiv();

const BACK_BUTTON =
  '<div id="button2" style="-webkit-animation-duration: '+ MAIN_TIMING +'s; animation-duration: '+ MAIN_TIMING +'s;" class="col-xs-6 fade-in-left">' +
  "<button id='goBack' onmouseout=\"arrowMoveBack('#back-arrow')\" onmouseover=\"arrowMove('#back-arrow')\"" +
  ' class="button button1"><span id="back-arrow" class="glyphicon glyphicon-menu-left"></span>  Back</button> </div>';

const BACK_BUTTON2 = BACK_BUTTON.slice().replace("page1", "page2");

const page3Ids = ["#top-message", "#event-planner", "#next-button"]
const page3Divs = [ASK_IF_HELP_TOP, HELP_OR_NO_HELP, BACK_BUTTON2]
const page3ToFade = ["#card2", "#card3", "#card4", "#goBack"];
const page3NotFade = []
const page3 = new Page(page3Ids, page3Divs, page3ToFade, page3NotFade);


const NOT_ENOUGH_PEOPLE_ERROR =
  '<div id="card3" class="col-md-12 main-card fade-in-right"> <h4 class="question-titles">' +
  "The minimum number of people to reserve a catering event is " +
  "minsizePlaceHolder" +
  ", <br>" +
  "but let's see if we can help out. Give us a call </h4>" +
  '<a class="question-titles" href="tel:+1-856-214-3413">(856)-214-3413</a> </div>';

const HOW_MANY_PEOPLE_DIV =
  '<div id="card2" class="col-md-12 main-card fade-in-left">' +
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

const NEXT_BUTTON =
  '<div id="button1" style="-webkit-animation-duration: '+MAIN_TIMING+'s; animation-duration: '+MAIN_TIMING+'s;" class="col-xs-6 fade-in-right">' +
  '<button id="goNext" onmouseout="arrowMoveBack(\'#next-arrow\')" onmouseover="arrowMove(\'#next-arrow\')" class="button button1">' +
  'Next <span id="next-arrow" class="glyphicon glyphicon-menu-right"></span></button></div>';

page3.startExit = () => {
  $("#card3").removeClass("choose-help-box");
  $("#card4").removeClass("choose-help-box");
  page3.exit( null, ["#top-message", "#event-planner"])
}
const prev_from_3 = {'#top-message' : page1_A, '#next-button' : BACK_BUTTON + NEXT_BUTTON }

page3.callBack = () => {
  $('#goBack').on('click', () => {
    page3.exit(page2, ['#top-message', '#event-planner', '#next-button'], prev_from_3)
  })
  $('#card4').on('click', () => {
      page3.startExit();
      setTimeout(function() { startHelpScreen(); }, SET_TIME);
  })
  $('#card3').on('click', () => {
      page3.startExit();
      setTimeout(() => { startSelectionScreen(); }, SET_TIME);
  })

}
const page2InsertIds = ["#event-planner", "#next-button"]
const page2Divs = [HOW_MANY_PEOPLE_DIV, BACK_BUTTON+NEXT_BUTTON];
const page2ToFade = [ "#card1", "#card2", "#card3", "#goNext", "#goBack", "#card4", '#button1'];
const page2GoBackException = ['#card1', '#card3', '#card4'];

const page2 = new Page(page2InsertIds, page2Divs, page2ToFade, page2GoBackException);

page2.callBack = () => {
  if ( window.eventVariables.numberOfPeople ){
    setInputs(['input[name="adults"]', 'input[name="kids"]'], [window.eventVariables.numberOfPeople.adults, window.eventVariables.numberOfPeople.kids])
  }
  $('#goBack').on('click', () => {
      page2.exit( page1, ["#event-planner", "#need-phone", "#next-button"] );
  })

  $('#goNext').on('click', () => {
     const isValidPeopleNum = saveNumberOfPeople("eventVariables", 'input[name="adults"]','input[name="kids"]');

     if (isValidPeopleNum) {
        sessionStorage.setItem('CURRENT_PAGE', '3');
        page2.exit( page3, ["#top-message", "#event-planner", "#need-phone","#next-button"] );
        // setTimeout(() => {$('#next-button').removeClass('fade-out-right')}, 1050)
     }else if (document.getElementById("card3") === null) {
         const lessThanMin = NOT_ENOUGH_PEOPLE_ERROR.slice().replace(
                              "minsizePlaceHolder",window.PageSettings.minsize );
         $("#need-phone").append(lessThanMin);
     }
  });

}


const saveNumberOfPeople = (saveVariable, inputForAdults, inputForKids) => {
  let adultsNum = document.querySelector(inputForAdults).value;
  adultsNum = adultsNum !== "" ? parseInt(adultsNum) : 0;

  let kidsNum = document.querySelector(inputForKids).value;
  kidsNum = kidsNum !== "" ? parseInt(kidsNum) : 0;

  let totalPeople = parseInt(adultsNum) + parseInt(kidsNum);

  window[saveVariable].numberOfPeople = { adults: adultsNum, kids: kidsNum };

  return totalPeople >= window.PageSettings.minsize;
};

/* *************************************************************************
   start menu selection screen
   window.selectedFoodOptions will keep track of the items chosen

*/
const MODAL_DIV =
  '<div id="myModal" class="modal question-titles"><div class="modal-content main-card">' +
  '<span class="close">X</span>' +
  "contentPlaceHolder" +
  "</div></div>";
const MAIN_MODAL_CONTENT =
  "<h4> ItemNamePlaceholder: </h4>" +
  "<h4> HeaderPlaceholder </h4>" +
  "<div class='selection row'> SelectionPlaceholder <div onclick='getWantedItem(getWantedParams)'" +
  "class='col-xs-2 col-xs-offset-8 add-select'>Add to cart</div></div>" +
  '<div class="row modal-add-to-order">namePlaceholder\'s in your cart: </div><div id="idPlaceholder"' +
  ' class="row"></div><div class="button button1" id="done-selection">Done</div>';

const ADD_MORE_MESSAGE =
  '<span class="tooltiptext">' +
  "Based on your number of people, we recommend the current cart limit. <br/> " +
  "But you can click here to increase the size of your cart!" +
  "</span></div>";

const AT_ORDER_LIMIT_DIV =
  '<div id="limit-message"style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1">' +
  'Currently at order limit <div onclick="allowMore()"class="button button1 want-more-button">Want to add to order?' +
  ADD_MORE_MESSAGE +
  "</div>";

const AT_FLAVOR_LIMIT_DIV =
  '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1"> Already at Max unique flavors for item</div>';

function startSelectionScreen(
  max_Items = 40,
  max_Flavors = window.defaultMaxFlavors,
  help = false
) {
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
  const helpDiv = help
    ? "<h4>Based on your party size, please select a total of " +
      max_Items +
      " items</h4>"
    : "";

  const HELPER_SCREEN = HELPER_SCREEN_DIV.slice()
    .replace("helpPlaceHolder", helpDiv)
    .replace("cardIdPlaceHolder", window.selectedFoodOptions["Id"]);

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

  const entreeItems = window.PageSettings["entree"];
  const categories = entreeItems.splice(-1);

  const sideItems = window.PageSettings["sides"];
  const sideCategories = sideItems.splice(-1);
  let itemDictIndex;

  $.each(entreeItems, function(index, value) {
    insertDivToOptions(idOfEntreeDiv, index, value.item);
    window.itemDictionary[index] = value;
    itemDictIndex = index;
  });

  window.itemDictionary["sides"] = buildSidesDict(sideItems);
  insertSidesDiv("sides", idOfEntreeDiv);
}
const buildSidesDict = function(listOfSides) {
  const newObject = {};

  let sidesDescription = "";
  let sidesOptions = "";
  let sidesSizes = "";

  listOfSides.forEach(function(value, index) {
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

const buildOptionsDict = function(dictionaryForItem) {
  const newObj = {};
  for (var key in dictionaryForItem) {
    if (key !== "description" && key !== "item") {
      if (dictionaryForItem.hasOwnProperty(key)) {
        const newList = dictionaryForItem[key].split(",");
        newList.forEach(function(element, index) {
          this[index] = element.trim();
        }, newList);
        newObj[key] = newList;
      }
    }
  }
  return newObj;
};

function insertSidesDiv(itemDictionaryKey, divId) {
  const buttonDiv = ITEM_NAME_BUTTON.replace(
    new RegExp("indexPlaceholder", "g"),
    itemDictionaryKey
  ).replace("itemName", "Sides");
  $(divId).append(buttonDiv);
}
// each of the entree items gets created on the page with this div element, show selection
// is called with the index of the item which can be used to get the key value pair of itemDictionary
function insertDivToOptions(idOfElement, index, item_name) {
  const translateClass = (index + 1) % 2 == 0 ? "shift-right" : "";
  const buttonDivToAppend = ITEM_NAME_BUTTON.replace(
    new RegExp("indexPlaceholder", "g"),
    index
  )
    .replace("itemName", item_name)
    .replace("xClass", translateClass);
  $(idOfElement).append(buttonDivToAppend);
}

// Show slection parameter is the key for the value pair of itemdictionary. which was set as the index
// of the item.
function showSelection(itemDictIndex) {
  const itemSelection = window.itemDictionary[itemDictIndex];

  // keep a tempory copy of the cart array to revert back to.
  var temp_cart_array = deepCopy(window[selectedFoodOptions["Id"]]);

  window.addItems = false;

  // keep a temporary copy of the foodCounter to revert back to if the modal is closed without confirming add items
  // var temp_food_count = deepCopy(window.foodCounter);

  // the main modal screen with div class='modal-content' holding the content and data
  let modalContent;
  // console.log(itemSelection);
  if (itemDictIndex !== "sides") {
    modalContent = MODAL_DIV.slice().replace(
      "contentPlaceHolder",
      getModalContent(itemSelection.item, itemSelection)
    );
  } else {
    modalContent = MODAL_DIV.replace(
      "contentPlaceHolder",
      getModalContent("Sides", itemSelection)
    );
  }

  $("#event-planner").append(modalContent);

  const modal = document.getElementById("myModal");
  const openButton = document.getElementById(itemDictIndex.toString());
  const span = document.getElementsByClassName("close")[0];
  const done = document.getElementById("done-selection");
  // these define clicking actions for opening and closing the modal
  openButton.onclick = function() {
    modal.style.display = "block";
    if (itemDictIndex === "sides") {
      // console.log("jere");
      setSelectionForSide();
    }
    const ifItemExists = window["foodCounter"][itemSelection.item];
    if (
      ifItemExists &&
      ifItemExists["items"] &&
      ifItemExists["items"].length > 0
    ) {
      drawToSelection(
        [itemSelection.item],
        "modal-selection",
        pickNumberOfItemsMessage()
      );
    }
  };
  span.onclick = function() {
    // if closed window without adding items, revert back to original cart.
    // resetFoodCounterAndCart(temp_food_count);
    addSelectionToCart("", itemSelection.item)
    modal.style.display = "none";
    $("#event-planner").empty();
  };
  done.onclick = () => {
    span.click();
  }
  window.onclick = function(event) {
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
  const idForSelectedList = "modal-selection";
  let content = MAIN_MODAL_CONTENT.replace(
    "ItemNamePlaceholder",
    itemSettings.item
  )
    .replace("HeaderPlaceholder", getHeaderForModal(itemSettings))
    .replace("SelectionPlaceholder", getSelectionForItem(itemSettings));

  const getWantedParams =
    '"' + itemSettings.item + '", "' + idForSelectedList + '"';

  content = content
    .replace("getWantedParams", getWantedParams)
    .replace("idPlaceholder", idForSelectedList);

  content = content.replace("namePlaceholder", itemSettings.item);

  return content;
}

// the top section of the modal
function getHeaderForModal(itemSettings) {
  let headerDiv = itemSettings.description;
  headerDiv += '<p class="please-select-from">Please choose from options:</p>';
  return headerDiv;
}
// creates a selection div with all the key value properties available for that food item.
function getSelectionForItem(itemSettings) {
  let temp_Dictionary = deepCopy(itemSettings);
  const itemName = temp_Dictionary.item;
  delete temp_Dictionary["description"];
  delete temp_Dictionary["item"];
  //
  let content = "";

  for (var key in temp_Dictionary) {
    if (
      temp_Dictionary.hasOwnProperty(key) &&
      temp_Dictionary[key].length > 1
    ) {
      if (window.selectedFoodOptions.help && key === "sizes") {
        content =
          "<div class='col-sm-6 col-md-4'> 1 Order includes a " +
          helpSizeConversion[itemName] +
          " count </div>" +
          content;
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
const trimKey = function(key) {
  if (key.slice(-1) == "s") {
    key = key.slice(0, -1);
  }
  return key;
};

// iterate throguth the values of the array and returns select, option element
function getSelectDiv(key, array) {
  key = trimKey(key);

  let content = beginSelectionDiv(key);

  $.each(array, function(index, value) {
    // value = value.replace(" ", "");
    content += getOptionDiv(key, value);
  });

  content += "</select></div>";

  return content;
}
const getOptionDiv = function(key, value) {
  return "<option value='" + key + "'>" + value.trim() + "</option>";
};

const beginSelectionDiv = function(key) {
  let content = "<div class='col-sm-6 col-md-4'> Choose " + key + " : ";
  if (key === "side") {
    return (content +=
      "<select id='selected-item' onchange='setSelectionForSide()' class='select-setting'>");
  } else {
    return (content += "<select class='select-setting'>");
  }
};

const setSelectionForSide = function() {
  const optionVal = $("#selected-item option:selected")[0].text;

  const getOptions = itemDictionary[optionVal];
  const selectionDivs = getSelectionDivsForSide(getOptions);
  $("#sideOptions").html(selectionDivs);
};

const getSelectionDivsForSide = function(sideDictionary) {
  let divString = "";
  for (const key in sideDictionary) {
    divString += getSelectDiv(key, sideDictionary[key]);
  }
  return divString;
};

const PICK_NUMBER_MORE_ITEMS =
  '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1">( Select numberPlaceholder more items )</div>';

const pickNumberOfItemsMessage = () => {
  if (selectedFoodOptions.help) {
    const numberOfItemsToPick =
      window.selectedFoodOptions["max_Items"] - window.foodCounter.total;
    return PICK_NUMBER_MORE_ITEMS.replace(
      "numberPlaceholder",
      numberOfItemsToPick
    );
  } else {
    return "";
  }
};

// when Select item presed, get the key, value pairings for each of the selection options.
function getWantedItem(nameOfItem, cartId) {
  // console.log(nameOfItem);
  let $selected = $(".select-setting");
  let thisItem = { count: 1, name: nameOfItem };
  if (window.selectedFoodOptions.help && nameOfItem !== "Side Choices") {
    thisItem["portion"] = helpSizeConversion[nameOfItem] + " count";
  }
  // create object with key value pairs
  $.each($selected, function(index, value) {
    thisItem[
      $(value)
        .find("option:selected")
        .val()
        .trim()
    ] = $(value)
      .find("option:selected")
      .text()
      .trim();
  });

  // need to make deep copy;
  let new_Object = deepCopy(thisItem);
  let value = 1;
  if (nameOfItem === "Side Choices") {
    value = 0;
  }
  let message = getAddToCartError(new_Object, value);
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
  const elem = window["foodCounter"][toAppend.name].find(item =>
    equalsExcept(item, toAppend, ["count", "cost"])
  );

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
  const atOrderLimit =
    window.foodCounter.total + action > window.selectedFoodOptions.max_Items;

  const alreadyHasFlavor =
    window.foodCounter[item.name] &&
    window.foodCounter[item.name].flavors.includes(item.flavor);

  const atFlavorLimit =
    window.foodCounter[item.name] && window.foodCounter[item.name].flavors.length === 4;

  if (atOrderLimit) {
    return AT_ORDER_LIMIT_DIV;
  } else if (!alreadyHasFlavor && atFlavorLimit) {
    return AT_FLAVOR_LIMIT_DIV;
  }

  // AddItem(item, action);
  return null;
}

function appendOrAddItem(toAppend, amount) {
  let changeTotal = amount;
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

  const idx = window.foodCounter[toAppend.name]["items"].findIndex(item =>
    equalsExcept(toAppend, item, ["count", "cost"])
  );
  const inCart = window.foodCounter[toAppend.name]["items"][idx];

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
  let temp_flavor_array = [];
  window.foodCounter[item_name].items.forEach(function(element) {
    if (!temp_flavor_array.includes(element.flavor))
      temp_flavor_array.push(element.flavor);
  });
  window.foodCounter[item_name].flavors = temp_flavor_array;
}

const getHtmlForItem = (
  entreeName,
  index,
  cartId,
  valueDictionary,
  arrayOfItemNames
) => {
  const appendValueParams =
    "'" +
    entreeName +
    "', '" +
    index +
    "', '" +
    cartId +
    "', '" +
    arrayOfItemNames +
    "'";

  let newDiv = ITEM_HTML_FOR_LIST.replace(
    /appendValuePlaceholder/g,
    appendValueParams
  ).replace("countPlaceholder", valueDictionary.count);

  for (key in valueDictionary) {
    if (key === "cost")
      newDiv +=
        "<small style='float:right;margin-right:20px;'>" +
        valueDictionary[key] +
        "</small>,";
    else if (key != "count") newDiv += " " + valueDictionary[key] + ",";
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

  let itemsDiv = message;
  arrayOfItemNames.forEach(entreeItem => {
    let listOfSelectedItems = window["foodCounter"][entreeItem];
    if (listOfSelectedItems && listOfSelectedItems.items) {
      listOfSelectedItems = listOfSelectedItems.items;
      listOfSelectedItems.forEach((selectedItem, index) => {
        itemsDiv += getHtmlForItem(
          entreeItem,
          index,
          cartId,
          selectedItem,
          arrayOfItemNames
        );
      });
    }
  });

  $("#" + cartId).html(itemsDiv);
}

function appendValue(itemName, index, cartId, arrayOfItemNames, value) {
  // console.log(" appending", array_name, index, value, cartId);
  index = parseInt(index);
  value = parseInt(value);
  let errorValue = value;
  if (itemName === "Side Choices") {
    errorValue = 0;
  }

  let thisItemObject = window["foodCounter"][itemName]["items"][index];

  let message = getAddToCartError(thisItemObject, errorValue);

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
}
// if addSelection to cart, push everything in allselected cart to main card, and set addItems ot true.
function addSelectionToCart(windowArray, itemName) {
  let allEntreeKeys = Object.keys(window.foodCounter);

  let $id = window.selectedFoodOptions.Id;
  drawToSelection(allEntreeKeys, $id, pickNumberOfItemsMessage());
  window.addItems = true;
  document.getElementsByClassName("close")[0].click();
}

function startHelpScreen() {
  // console.log("Help");
  let numGuests = 0;
  const numKids = window.eventVariables.numberOfPeople.kids
  const numAdults = window.eventVariables.numberOfPeople.adults
  if ( (numKids + numAdults) >= 8 && (0.5*numKids + numAdults) < 8 ){
    numGuests = 8;
  }else{
    numGuests = (0.5*numKids) + numAdults;
  }
  let maxItems = Math.ceil(
    (numGuests) /
      parseInt(window.PageSettings.minsize)
  );
  let maxFlavors = Math.min(maxItems, 4);

  startSelectionScreen(maxItems, maxFlavors, true);
}
// calling this function will get JSON data about the menu and other settings for building page
function initSettings(idOfMin) {
  const settings = sessionStorage.getItem("PageSettings");

  if ( settings === null ){
    $.get("/_get_menu", {}, function(data) {
      window.PageSettings = data;
      sessionStorage.setItem("PageSettings", JSON.stringify(data));
      $(idOfMin).append(data.minsize);
    });
  }else {
    window.PageSettings = JSON.parse( settings );
  } if (window.editOrder) {
    startSelectionScreen();
    const checkOutButton = $("#checkoutButton");
    checkOutButton.html("Confirm Changes");
    checkOutButton
      .removeClass("col-xs-5")
      .removeClass("col-sm-3")
      .addClass("col-xs-12");
    checkOutButton.attr("onclick", "confirmChanges()");
  } else {
    setUpBackFromCart();
  }

  // }
}

initSettings("#min1");

function proceedToCheckout(myCart) {
  let itemCount = 0;
  const keys = Object.keys(window.foodCounter);
  for (const key of keys) {
    if (key !== "total") {
      if (window.foodCounter[key].hasOwnProperty("items")) {
        itemCount += window.foodCounter[key].items.length;
      }
    }
  }
  if (itemCount === 0) {
    alert("There doesn't seem to be anything in your cart!");
    return;
  }
  const people = JSON.stringify(window.eventVariables.numberOfPeople);
  sessionStorage.setItem("people", people);

  sessionStorage.setItem("date", window.eventVariables.date);

  const foodCount = JSON.stringify(window.foodCounter);
  sessionStorage.setItem("foodCounter", foodCount);

  const otherSettings = JSON.stringify(window.selectedFoodOptions);
  sessionStorage.setItem("otherSettings", otherSettings);

  // if (sessionStorage.getItem("logged_in") == null) {
  location.href = "/confirmCart#order-summary";
  // } else {
  //   location.href = "";
  // }
}
