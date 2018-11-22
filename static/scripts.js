var eventVariables = {};
var device;
if (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
) {
  device = "mobile";
} else {
  device = "desk";
}
var windowWidth = window.innerWidth;
// Element.prototype.remove = function() {
//   this.parentElement.removeChild(this);
// };
// NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
//   for (var i = this.length - 1; i >= 0; i--) {
//     if (this[i] && this[i].parentElement) {
//       this[i].parentElement.removeChild(this[i]);
//     }
//   }
// };

function setPicker() {
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
    console.log("picker set");
  }
  let el = document.getElementById("timepicker");
  if (el) {
    var $timeInput = $("#timepicker").pickatime();
    var timePicker = $timeInput.pickatime("picker");
    let minTime = [11, 00];
    let maxTime = [20, 00];
    timePicker.set("min", minTime);
    timePicker.set("max", maxTime);
  }
  //   var today = new Date();
  //   var dd = today.getDate();
  //   var mm = today.getMonth();
  //   var yyyy = today.getFullYear();
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

function planEvent() {
  let dateSelector = $("#datepicker");
  // console.log(dateSelector);
  document.querySelector('input[name="date"]').onchange = changeEventHandler;
  // dateSelector[0].addEventListener("input", function(e) {
  //   console.log("yes");
  //   $("#need-phone")
  //     .removeClass("hidden")
  //     .addClass("fade-in-right");
  // });
}
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

function arrowMove() {
  let next_Arrow = $("#next-arrow");
  next_Arrow.css("padding-left", "14px");
}
function arrowMoveBack() {
  let next_Arrow = $("#next-arrow");
  next_Arrow.css("padding-left", "0px");
}
function nextWindow() {
  let eventDate = document.getElementById("datepicker").value;
  eventVariables.date = eventDate;

  fadeOutMain();

  setTimeout(function() {
    [$("#event-planner"), $("#need-phone"), $("#next-button")].map(div =>
      div.empty()
    );
    let howManyPeopleDiv =
      // '<div class="row normalize-height">' +
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
      '<button onclick="nextWindow2()" onmouseout="arrowMoveBack()" onmouseover="arrowMove()" class="button button1">' +
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

  if (totalPeople < 8) {
    if (document.getElementById("card3") === null) {
      let lessThanMin =
        '<div id="card3" class="col-md-6 col-md-offset-3 main-card fade-in-right"> <h4 class="question-titles">' +
        "The minimum number of people to reserve a catering event is 8, <br>" +
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
    '<div id="card2" class="col-md-6 col-md-offset-3 main-card fade-in-right"> <h4 class="question-titles">' +
    'Almost there! </h4><h4 class="question-titles">We\'d love to help you decide <br>how much food to get for your gathering </h4>' +
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
function startHelpScreen() {
  let maxItems = Math.floor(
    (eventVariables.numberOfPeople.adults +
      eventVariables.numberOfPeople.kids) /
      8
  );
  let maxFlavors = Math.min([maxItems, 4]);
  let itemsGrammer = maxItems > 1 ? " items" : " item";

  /* Return an array of the div elements representing food options*/
  const setFoodOptions = getFoodOptionsDivs();

  let helperScreenDiv =
    '<div id="card2" class="col-lg-8 col-lg-offset-2 main-card fade-in-left helper-screen">' +
    '<h4 class="question-titles">We recommend that you choose ' +
    maxItems.toString() +
    itemsGrammer +
    " from the options below. </h4><div class='row normalize-height'><div id='food-options' class='col-md-6'><h3 style='border-bottom: 1px solid;'>Entree Options</h3></div>" +
    "<div id='selected-food' class='col-md-6'><h3 style='border-bottom: 1px solid;' >Selected Items</h3>" +
    "<p>( <span id='selected-message'> Choose <span id='num-to-choose'>" +
    maxItems.toString() +
    " more</spand></span> )</p></div></div></div>";

  $("#top-message").append(helperScreenDiv);

  setFoodOptions.forEach(function(element) {
    $("#food-options").append(element);
  });

  // entree_Items.forEach(function(element) {
  //   element.addEventListener("click", showSelection1(element.innerText));
  // });
}
function startSelectionScreen() {
  console.log("no Help");
}

function getFoodOptionsDivs() {
  let divs = [
    '<div id="item1" class="entree-options row"><div onclick="showSelection1(\'Burrito\')" class="col-lg-12 entree-item">Burrito Tray</div></div>',
    '<div id="item2" class="entree-options row"><div onclick="showSelection1(\'Chicken\')" class="col-lg-12 entree-item">Chicken Tray</div></div>',
    '<div id="item3" class="entree-options row"><div onclick="showSelection1(\'Taco\')" class="col-lg-12 entree-item">Taco Tray</div></div>',
    '<div id="item4" class="entree-options row"><div onclick="showSelection1(\'Nacho\')" class="col-lg-12 entree-item">Nacho Bar</div></div>',
    '<div id="item5" class="entree-options row"><div onclick="showSelection1(\'Chili\')" class="col-lg-12 entree-item">Chili</div></div>'
  ];
  return divs;
}

function showSelection1(itemName) {
  let modalDiv =
    '<div id="myModal" class="modal"><div class="modal-content"> <span class="close">Close</span>' +
    "<p>Some text in the Modal..</p> </div></div>";
  $("#event-planner").append(modalDiv);

  let modal = document.getElementById("myModal");
  let openButton = document.getElementById("item1");
  let span = document.getElementsByClassName("close")[0];

  openButton.onclick = function() {
    modal.style.display = "block";
  };
  span.onclick = function() {
    modal.style.display = "none";
  };
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}

function getFlavorOptions(item) {
  if (item == "Burrito")
    return {
      itemNum: "1",
      choices: [
        "Beef",
        "Steak",
        "Carnitas",
        "Chicken",
        "Fish",
        "Shrimp",
        "Veggie"
      ]
    };
}
