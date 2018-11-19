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
  console.log(dateSelector);
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
