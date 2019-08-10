function showUpcoming() {
  var futureOrderSection = $("#future-orders");

  if (futureOrderSection.hasClass("hidden")) {
    futureOrderSection.removeClass("hidden");
    $("#past-orders").addClass("hidden");
  }
}

function showPast() {
  var pastOrdersSection = $("#past-orders");

  if (pastOrdersSection.hasClass("hidden")) {
    pastOrdersSection.removeClass("hidden");
    $("#future-orders").addClass("hidden");
  }
}

function editOrder(div) {
  var num = $(div).attr("id");
  var form = document.createElement("form");
  var hiddenInput = document.createElement("input");
  hiddenInput.setAttribute("type", "hidden");
  hiddenInput.setAttribute("name", "confirmation_code");
  hiddenInput.setAttribute("value", num);
  form.appendChild(hiddenInput);
  $.post("/set_edit_order_num/", $(form).serialize())
    .done(function(response) {
      if (response.hasOwnProperty("error")) {
        alert("There was an issue connecting.");
      } else {
        location.href = "/edit_order";
      }
    })
    .fail(function() {
      alert("There is a problem with the connecting.");
    });
}

var CONTACT_MODAL_DIV =
  '<div id="myModal" class="modal question-titles"><div class="modal-content main-card">' +
  '<span class="close">X</span>' +
  "contentPlaceHolder" +
  "</div></div>";

function editContact(modalTagId, orderNum) {
  var valuesDict = {};
  var listOfKeys = ["Name", "Phone", "Address", "Email", "Comments"];
  listOfKeys.forEach(function(value) {
    valuesDict[value] = $("#" + orderNum + value.toLowerCase()).html();
  }); // console.log(valuesDict);

  var modalDiv = CONTACT_MODAL_DIV.replace(
    "contentPlaceHolder",
    getContactModal(orderNum, valuesDict, listOfKeys)
  );
  $(modalTagId).append(modalDiv);
  var modal = document.getElementById("myModal"); // const openButton = document.getElementById(orderNum + "EditContact");

  var span = document.getElementsByClassName("close")[0];
  var done = document.getElementById("done"); // these define clicking actions for opening and closing the modal
  // openButton.onclick = function() {

  modal.style.display = "block"; // };

  span.onclick = function() {
    modal.style.display = "none";
    $(modalTagId).html("");
  };

  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
      $(modalTagId).html("");
    }
  };

  document.getElementById("done-button").addEventListener("click", function() {
    var build_contact_dict = {
      confirmation_code: orderNum
    };
    listOfKeys.forEach(function(value, index) {
      var input_value = $("#" + value).val();
      build_contact_dict[value] = input_value;
    }); // console.log(build_contact_dict);

    $.post("/change_contact_info/", build_contact_dict).done(function(data) {
      if (data.hasOwnProperty("Error")) {
        alert("Something went wrong " + data.error);
      } else {
        location.reload();
        span.click();
      }
    });
  });
}

var CONTACT_MODAL_FORM =
  '<div class="row edit-contact-div"><div class="col-xs-2"> labelPlaceholder:</div>' +
  '<div class="col-xs-8 col-sm-9"><input id="key" class="edit-contact-input" value="valuePlaceholder"></div></div>';
var CONTACT_FORM_DONE_BUTTON =
  '<div id="done-button" class="col-xs-12 col-sm-6 col-sm-offset-3 button button1">Set!</div>';

function getContactModal(orderNum, valuesDict, listOfLabels) {
  var modalFormToReturn = "";
  listOfLabels.forEach(function(value, index) {
    modalFormToReturn += CONTACT_MODAL_FORM.replace("labelPlaceholder", value)
      .replace("valuePlaceholder", valuesDict[value])
      .replace("key", value);
  });
  return modalFormToReturn + CONTACT_FORM_DONE_BUTTON;
}
