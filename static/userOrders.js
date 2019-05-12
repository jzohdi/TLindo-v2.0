function showUpcoming() {
  const futureOrderSection = $("#future-orders");
  if (futureOrderSection.hasClass("hidden")) {
    futureOrderSection.removeClass("hidden");
    $("#past-orders").addClass("hidden");
  }
}

function showPast() {
  const pastOrdersSection = $("#past-orders");
  if (pastOrdersSection.hasClass("hidden")) {
    pastOrdersSection.removeClass("hidden");
    $("#future-orders").addClass("hidden");
  }
}

function editOrder(div) {
  const num = $(div).attr("id");
  location.href = "/edit_order?order_num=" + num;
}
const CONTACT_MODAL_DIV =
  '<div id="myModal" class="modal question-titles"><div class="modal-content main-card">' +
  '<span class="close">X</span>' +
  "contentPlaceHolder" +
  "</div></div>";

function editContact(modalTagId, orderNum) {
  const valuesDict = {};
  const listOfKeys = ["Name", "Phone", "Address", "Email", "Comments"];
  listOfKeys.forEach(function(value) {
    valuesDict[value] = $("#" + orderNum + value.toLowerCase())
      .html()
      .trim();
  });
  // console.log(valuesDict);
  let modalDiv = CONTACT_MODAL_DIV.replace(
    "contentPlaceHolder",
    getContactModal(orderNum, valuesDict, listOfKeys)
  );

  $(modalTagId).append(modalDiv);

  const modal = document.getElementById("myModal");
  // const openButton = document.getElementById(orderNum + "EditContact");
  const span = document.getElementsByClassName("close")[0];
  const done = document.getElementById("done");

  // these define clicking actions for opening and closing the modal
  // openButton.onclick = function() {
  modal.style.display = "block";
  // };
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

  document
    .getElementById("done-button")
    .addEventListener("click", function() {
      const build_contact_dict = { order_num: orderNum };
      listOfKeys.forEach(function(value, index) {
        const input_value = $("#" + value).val();
        build_contact_dict[value] = input_value;
      });
      // console.log(build_contact_dict);
      $.post("/change_contact_info/", build_contact_dict).done(function(
        data
      ) {
        if (data.error != "Contact Set!") {
          alert("Something went wrong " + data.error);
        } else {
          location.reload();
          span.click();
    }
  });
});
}

const CONTACT_MODAL_FORM =
  '<div class="row edit-contact-div"><div class="col-xs-2"> labelPlaceholder:</div>' +
  '<div class="col-xs-8 col-sm-9"><input id="key" class="edit-contact-input" value="valuePlaceholder"></div></div>';
const CONTACT_FORM_DONE_BUTTON =
  '<div id="done-button" class="col-xs-12 col-sm-6 col-sm-offset-3 button button1">Done!</div>';

function getContactModal(orderNum, valuesDict, listOfLabels) {
  let modalFormToReturn = "";
  listOfLabels.forEach(function(value, index) {
    modalFormToReturn += CONTACT_MODAL_FORM.replace(
      "labelPlaceholder",
      value
    )
      .replace("valuePlaceholder", valuesDict[value])
      .replace("key", value);
  });

  return modalFormToReturn + CONTACT_FORM_DONE_BUTTON;
}