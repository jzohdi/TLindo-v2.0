// set up the window variables that can be used later. including
// getting whether the user is on a phone device or desktop.
var eventVariables = {};
window.device;
if (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
) {
  device = "mobile";
} else {
  device = "desk";
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
    '<div onclick="setUpHelpScreen(\'nohelp\')" id="card3" class="card-margin1 col-md-4 col-md-offset-2 main-card fade-in-left"><h4 class="question-titles">No Thanks, I know how much I want' +
    "</h4></div>" +
    '<div onclick="setUpHelpScreen(\'help\')" id="card4" class="card-margin2 col-md-4 main-card fade-in-right"><h4 class="question-titles">I could use some help!' +
    "</h4></div>";
  $("#event-planner").append(newDiv2);
}

function setUpHelpScreen(needHelp) {
  fadeOutMain();

  setTimeout(function() {
    [$("#top-message"), $("#event-planner")].map(div => div.empty());
    if (needHelp === "help") startHelpScreen();
    if (needHelp === "nohelp") startSelectionScreen();
  }, 1000);
}
function startSelectionScreen() {
  /* Return an array of the div elements representing food options*/

  window.selectedFoodOptions = {};
  let helperScreenDiv =
    '<div id="card2" class="col-md-8 col-md-offset-2 main-card fade-in-left helper-screen">' +
    "<div class='row normalize-height'><div id='food-options' class='col-md-6'><h3 style='border-bottom: 1px solid;'>Entree Options</h3></div>" +
    "<div id='selected-food' class='col-md-6'><h3 style='border-bottom: 1px solid;' >Selected Items</h3> </div></div></div>";

  $("#top-message").append(helperScreenDiv);
}
function startHelpScreen() {
  console.log("Help");
  let maxItems = Math.floor(
    (eventVariables.numberOfPeople.adults +
      eventVariables.numberOfPeople.kids) /
      8
  );
  let maxFlavors = Math.min([maxItems, 4]);
  let itemsGrammer = maxItems > 1 ? " items" : " item";
}

// let divs = [
//   '<div id="item1" class="entree-options row"><div onclick="showSelection1(\'Burrito\', 1)" class="col-xs-6 col-xs-offset-3 entree-item">Burrito Tray</div></div>'
// ];

function showSelection1(itemName, num) {
  let itemSelection = getSelection(num);

  let modalDiv =
    '<div id="myModal" class="modal question-titles"><div id="add-modal-content" class="main-card">' +
    '<span class="close">X</span>' +
    itemSelection +
    "</div></div>";
  $("#event-planner").append(modalDiv);

  let modal = document.getElementById("myModal");
  let openButton = document.getElementById("item" + num.toString());
  let span = document.getElementsByClassName("close")[0];
  let done = document.getElementById("done");

  openButton.onclick = function() {
    modal.style.display = "block";
  };
  span.onclick = function() {
    modal.style.display = "none";
    $("#event-planner").empty();
  };
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
      $("#event-planner").empty();
    }
  };
}

function getSelection(itemNum) {
  let divToAppendInModal;
  let entreeType = getEntreeType(itemNum);
  let meatChoices = "";
  let AllChoices = getFlavorOptions(itemNum);
  let portions = getPortionOptions(itemNum);

  /* get flavor optiosn for that option, and iterate through, creating div elements to match */

  for (let meatChoice = 0; meatChoice < AllChoices.length; meatChoice++) {
    let selectionPortion = "";
    for (
      let portionChoice = 0;
      portionChoice < portions.length;
      portionChoice++
    ) {
      selectionPortion +=
        "<option value='" +
        portions[portionChoice] +
        "'>" +
        portions[portionChoice] +
        "</option>";
    }
    let meatChoiceDiv =
      "<div class='col-md-12 entree-item'><div class='row'><div class='col-sm-6'>" +
      AllChoices[meatChoice] +
      "</div><div class='col-sm-6'><div class='custom-select'><select id='" +
      AllChoices[meatChoice] +
      "' " +
      "onchange='addToSelection(\"" +
      AllChoices[meatChoice] +
      "\")'>" +
      selectionPortion +
      "</select></div></div></div></div>";
    meatChoices += meatChoiceDiv;
  }

  meatChoices +=
    "<div id='done' onclick='enterOptionsOntoSelection()' class='col-sm-4 col-sm-offset-4 button button1'> Done! </div>";
  divToAppendInModal =
    "<div style='padding-top: 10vh'><h4 style='border-bottom: 2px solid;' >Choose meat and portion options for <span id='food-type'>" +
    entreeType +
    "</span>:</h4>" +
    meatChoices;
  return divToAppendInModal;
}

function addToSelection(meatSelection) {
  let portion_size = document.getElementById(meatSelection).value;
  if (portion_size === "None") {
    delete selectedFoodOptions[meatSelection];
  } else {
    let food_type = document.getElementById("food-type").innerHTML;

    selectedFoodOptions[meatSelection] = [portion_size, food_type];
  }
}
