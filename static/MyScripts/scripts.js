const BASE_ROOT = "/static/MyScripts/";

// const MAIN_CARD_WIDTH = "col-md-10 col-md-offset-1";

const script1 = $.getScript(BASE_ROOT + "helpers.js");

$.when(script1).done(function() {});
function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}
function objectsAreEqual(objectOne, objectTwo, arrayToExclude = []) {
  const o1 = deepCopy(objectOne);
  const o2 = deepCopy(objectTwo);
  for (const key of arrayToExclude) {
    delete o1[key];
    delete o2[key];
  }
  return JSON.stringify(o1) == JSON.stringify(o2);
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

function setPicker(
  selectDate = sessionStorage.getItem("date"),
  disabled = undefined
) {
  // collect dates to disable for picker + check to see if element exists on page.
  // earlier the list of dates to exclude are set in the element that is hidden with id of dates-to-hide
  // here we get those dates, and convert them with new Date() to raw datetime data which
  // can be used by the date picker in the form of an array of dates to disable
  if (sessionStorage.getItem("disabledDates") == undefined) {
    const finalArrayOfDates = [];
    $.get("/disabled_dates", function(data) {
      console.log(data);
      data.forEach(function(element, index) {
        const formatDate = new Date(element);
        finalArrayOfDates.push(formatDate);
      });
      sessionStorage.setItem(
        "disabledDates",
        JSON.stringify(finalArrayOfDates)
      );
      setDatePicker(selectDate, finalArrayOfDates);
    });
  } else {
    const finalArrayOfDates = JSON.parse(
      sessionStorage.getItem("disabledDates")
    );
    setDatePicker(selectDate, finalArrayOfDates);
  }
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
    if (selectDate) {
      picker.set("select", selectDate);
    }
    // console.log("picker set");
  }
}

setPicker();

const MODAL_DIV =
  '<div id="myModal" class="modal question-titles"><div class="modal-content main-card">' +
  '<span class="close">X</span>' +
  "contentPlaceHolder" +
  "</div></div>";

const createModal = (someIdOnPage, content) => {
  const modalContent = MODAL_DIV.replace("contentPlaceHolder", content);
  $(someIdOnPage).html(modalContent);

  const modal = document.getElementById("myModal");
  // const openButton = document.getElementById(triggerId);
  const span = document.getElementsByClassName("close")[0];
  const done = document.getElementById("done-selection");

  modal.style.display = "block";

  span.onclick = function() {
    modal.style.display = "none";
    $(someIdOnPage).empty();
  };
  done.onclick = () => {
    span.click();
  };
  window.onclick = function(event) {
    if (event.target == modal) {
      span.click();
    }
  };
};

const MAIN_MODAL_CONTENT =
  "<h2> ItemNamePlaceholder: </h2>" +
  "<p> HeaderPlaceholder </p>" +
  "<div class='selection row'> SelectionPlaceholder <div id='addToCart'" +
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
  'Currently at order limit <div id="add-more" class="button button1 want-more-button">Want to add to order?' +
  ADD_MORE_MESSAGE +
  "</div>";

const AT_FLAVOR_LIMIT_DIV =
  '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1"> Sorry, you have reached the max number of unique flavors for item</div>';

const PICK_NUMBER_MORE_ITEMS =
  '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1">( Select numberPlaceholder more entrees )</div>';

const ITEM_HTML_FOR_LIST =
  '<div class="col-xs-12 col-sm-10 col-sm-offset-1"><span class="span increase"  id="appendValuePlaceholder"> ' +
  '+ </span> countPlaceholder <span class="span decrease" id="appendValuePlaceholder"> - </span>';
