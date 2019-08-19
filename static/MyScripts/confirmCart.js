const urlDecode = function() {
  const urlSearchString = window.location.search;
  if (!urlSearchString.includes("?")) return {};
  const paramDictionary = JSON.parse(
    decodeURIComponent(urlSearchString.replace("?", ""))
  );
  return paramDictionary;
};
var ITEM_HTML_FOR_LIST = `<tr><td class='count-column'><span class="span increase" id="appendValuePlaceholder"> + </span> countPlaceholder <span class="span decrease" id="appendValuePlaceholder"> - </span></td>`;

const DEFAULT_MIN = 8;
const LOADING_HTML = `<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>`;
$("#my-cart").html(LOADING_HTML);
function FoodCounter(cart, app, pricesDict) {
  this.cart = cart;
  this.toLimit = new Set(["Entree", "entree"]);
  this.parentApp = app;
  this.possibleSizeKeys = ["size", "sizes", "portion", "portions"];
  this.possibleCostKeys = [
    ...this.possibleSizeKeys,
    "flavor",
    "flavors",
    "meat",
    "protein"
  ];
  this.prices = pricesDict;

  this.getHtmlForItem = function(itemObject, index, itemPrice) {
    const appendValueParams = index.toString();
    var newDiv = ITEM_HTML_FOR_LIST.replace(
      /appendValuePlaceholder/g,
      appendValueParams
    ).replace("countPlaceholder", itemObject.count);
    newDiv += "<td>"
      .concat(itemObject.name, " - ")
      .concat(itemObject.size, "</td>");
    newDiv += "<td class='price-column'>$ ".concat(itemPrice, "</td></tr>");

    var copyObject = JSON.parse(JSON.stringify(itemObject));
    delete copyObject["name"];
    delete copyObject["size"];
    delete copyObject["count"];
    newDiv += "<tr><td></td><td class='cart-item-description'>".concat(
      this.getListFromItem(copyObject),
      "</td><td></td></tr>"
    );

    return newDiv;
  };

  this.toString = function(itemName = null) {
    let total = 0.0;
    let cartToString = "";
    const self = this;
    this.cart.forEach(function(itemInCart, index) {
      var itemPrice = self.getPriceForItem(itemInCart).toFixed(2);
      if (!itemName || itemInCart.name == itemName) {
        cartToString += self.getHtmlForItem(itemInCart, index, itemPrice);
      }
      total += parseFloat(itemPrice);
    });
    var tax = total * 0.06625;
    $("#cart-base").html(total.toFixed(2));
    $("#cart-tax").html(tax.toFixed(2));
    $("#cart-total").html(total.toFixed(2));
    return cartToString;
  };

  this.getPriceForItem = function(itemToGetPricesFrom) {
    let total = 1.0;
    const itemName = itemToGetPricesFrom.name;
    const keysToCalculateCost = this.getCostKeys(itemToGetPricesFrom);

    const thisItemPriceDict = this.prices[itemName];
    for (const key of keysToCalculateCost) {
      const priceDictKeyValue = parseFloat(thisItemPriceDict[key]);
      total *= priceDictKeyValue.toFixed(2);
    }
    total *= itemToGetPricesFrom["count"].toFixed(2);
    return total;
  };

  this.getCostKeys = function(itemObject) {
    const keysFoundInItemObject = [];
    for (const possibleCostKey of this.possibleCostKeys) {
      if (itemObject.hasOwnProperty(possibleCostKey)) {
        keysFoundInItemObject.push(itemObject[possibleCostKey]);
      }
    }
    return keysFoundInItemObject;
  };
}

function App(cart, pricesDict) {
  this.toLimit = new Set(["Entree", "entree"]);
  this.foodCounter = new FoodCounter(cart, this, pricesDict);
  this.maxItems = 20;
  this.maxFlavors = 4;
  this.currentItem = "";
  this.help = false;
  this.validGuests = false;
  this.environ = {};
  this.total = 0;
  this.billingSame = false;

  this.run = function() {
    this.showSelectedFood("#my-cart");
  };

  this.showSelectedFood = function(
    idOfTarget,
    itemName = undefined,
    errorMessage = ""
  ) {
    const MyApp = this;
    // draw the selection to the cart
    let showSelectedFood = this.foodCounter.toString(itemName);
    $(idOfTarget).html(showSelectedFood);
    sessionStorage.setItem("cart", JSON.stringify(this.foodCounter.cart));
    // add controllers for the increase count and decrease count
    const incButtons = document.getElementsByClassName("increase");
    for (let x = 0; x < incButtons.length; x++) {
      incButtons[x].addEventListener("click", function() {
        MyApp.foodCounter.cart[this.id].count += 1;
        MyApp.showSelectedFood(idOfTarget, itemName);
      });
    }

    const decButtons = document.getElementsByClassName("decrease");
    for (let x = 0; x < decButtons.length; x++) {
      decButtons[x].addEventListener("click", function() {
        MyApp.foodCounter.cart[this.id].count -= 1;
        // if the count for this item goes to 0, remove it from the cart.
        if (MyApp.foodCounter.cart[this.id].count == 0) {
          MyApp.foodCounter.cart.splice(this.id, 1);
        }
        MyApp.showSelectedFood(idOfTarget, itemName);
      });
    }
  };
}

const getSelectedOptions = function(nameOfItem, itemType) {
  const $selected = $(".select-setting");
  const thisItem = { count: 1, name: nameOfItem, type: itemType };
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
  return thisItem;
};

let cart = [];
const urlParams = urlDecode();
if (sessionStorage.getItem("cart") != undefined) {
  cart = JSON.parse(sessionStorage.getItem("cart"));
}
if (urlParams.hasOwnProperty("cart")) {
  cart = urlParams["cart"];
}
let app;

const getPricesAsync = function() {
  const response = fetch("/get_prices/")
    .then(function(response) {
      return response.json();
    })
    .then(function(myJson) {
      app = new App(cart, myJson);
      const paramsDictionary = {
        cart: app.foodCounter.cart,
        date: $("#datepicker").val()
      };
      urlEncodeParams(paramsDictionary);
      app.run();

      main();
    });
};

getPricesAsync();

const main = function() {
  const backToMenu = function() {
    sessionStorage.setItem("date", $("#datepicker").val());
    sessionStorage.setItem("cart", JSON.stringify(app.foodCounter.cart));
    document.location.href = "/";
  };
  $("#back-to-menu").on("click", () => {
    backToMenu();
  });
  document.getElementById("payment-form").reset();
  // Custom styling can be passed to options when creating an Element.
  // (Note that this demo uses a wider set of styles than the guide below.)
  const style = {
    base: {
      color: "#32325d",
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#aab7c4"
      }
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a"
    }
  };
  // Create a Stripe client.
  const stripe = Stripe("pk_test_L8yMZPmXBR046Uxp2PzjT4O9");
  // Create an instance of Elements.
  const elements = stripe.elements();
  // Create an instance of the card Element.
  const card = elements.create("card", { style });
  // Add an instance of the card Element into the `card-element` <div>.
  card.mount("#card-element");

  card.addEventListener("change", ({ error }) => {
    const displayError = document.getElementById("card-errors");
    if (error) {
      displayError.textContent = error.message;
    } else {
      displayError.textContent = "";
    }
  });
  const createToken = function(placeOrderButton, changeBack) {
    stripe.createToken(card).then(function(result) {
      if (result.error) {
        // Inform the user if there was an error
        var errorElement = document.getElementById("card-errors");
        errorElement.textContent = result.error.message;
        placeOrderButton.html(changeBack);
      } else {
        // Send the token to your server
        stripeTokenHandler(result.token, placeOrderButton, changeBack);
      }
    });
  };
  function stripeTokenHandler(token, placeOrderButton, changeBack) {
    // Insert the token ID into the form so it gets submitted to the server
    const form = document.getElementById("payment-form");
    const hiddenInput = document.createElement("input");
    hiddenInput.setAttribute("type", "hidden");
    hiddenInput.setAttribute("name", "stripeToken");
    hiddenInput.setAttribute("value", token.id);
    form.appendChild(hiddenInput);
    // const orderInformation = getOrderInfoAsDictionary();
    const arrayOf2DElements = [
      ["name", $('input[name="orderName"]')[0].value],
      ["date", $("#datepicker").val()],
      ["phone", $('input[name="orderPhone"]')[0].value],
      ["email", $('input[name="orderEmail"]')[0].value],
      ["address", parseAddress()],
      ["order", parseFoodCounter()],
      ["notes", $('textarea[name="additional-comments"]')[0].value],
      ["billing", getBillingAddress()]
    ];
    addOrderInformation(form, arrayOf2DElements);
    $.post("/charge", $(form).serialize())
      .done(function(data) {
        if (data.hasOwnProperty("error")) {
          placeOrderButton.html(changeBack);
          alert("something went wrong " + data.error);
          location.reload();
        } else {
          location.href = "/order_placed/";
        }
      })
      .fail(function(data) {
        placeOrderButton.html(changeBack);
        alert("something went wrong " + data.error);
      });
    // Submit the form
    // form.submit();
  }
  // Create a token when the form is submitted.
  // var form = document.getElementById('payment-form');
  // form.addEventListener('submit', function(e) {
  //   e.preventDefault();

  // });

  function toggleHide(tagId) {
    if (!$(tagId).hasClass("hidden")) {
      $(tagId).addClass("hidden");
    } else {
      $(tagId).removeClass("hidden");
    }
  }
  const showForm = formName => {
    const wantedForm = formName === "login" ? "login" : "register";
    const other = formName === "login" ? "register" : "login";
    if (!$("#" + other + "-form").hasClass("hidden")) {
      $("#" + other + "-form").addClass("hidden");
    }
    $("#" + wantedForm + "-form").removeClass("hidden");
    $("#" + other).removeClass("hidden");
    $("#" + wantedForm).addClass("hidden");
  };

  function continue_as_guest() {
    const loginRegisterHtml = $("#register-login-section").html();
    $("#register-login-section").html(LOADING_HTML);
    $.get("/guest_login/", function() {}).done(function(data) {
      if (data.hasOwnProperty("error")) {
        $("#register-login-section").html(loginRegisterHtml);
        alert("something went wrong " + data.error);
      } else {
        const confirmationCode = data.code;
        $("#register-login-section").empty();
        $("#register-login-section").html(
          '<h4>Your Confirmation Code is: <span class="red-title">' +
            confirmationCode +
            "</span></h4>" +
            "<p>*Use this code for referencing your order in the future*</p>"
        );
        window.id = true;
      }
    });
  }

  function request_login() {
    let username = $('input[name="login_username"]')[0].value;
    if (username === "") {
      $("#login_error").html("Username required to log in");
      return false;
    }
    if ($('input[name="login_password"]')[0].value == "") {
      $("#login_error").html("Password required to log in");
      return false;
    }
    const form = document.createElement("form");
    const arrayOf2DElements = [
      ["username", username],
      ["pass", $('input[name="login_password"]')[0].value]
    ];
    addOrderInformation(form, arrayOf2DElements);
    const formBeforeLoading = $("#register-login-section").html();
    $("#register-login-section").html(LOADING_HTML);
    $.post("/request_login/", $(form).serialize())
      .done(function(data) {
        if (data.hasOwnProperty("error")) {
          $("#register-login-section").html(formBeforeLoading);
          $("#login_error").html("error logging in");
        } else {
          $("#register-login-section").empty();
          $("#register-login-section").html(
            "<h4>Succesful login! Username: <span style='color: #de4621;'>" +
              data.username +
              "</span></h4>"
          );
          convertNavBar();
          window.id = true;
        }
      })
      .fail(function(errorThrown) {
        $("#register-login-section").html(formBeforeLoading);
        alert(errorThrown);
      });
  }

  const checkPassword = function(error_message) {
    const password = $('input[name="register_password"]')[0].value;
    if (!/[A-Z]/.test(password)) {
      error_message.html("Password requires at least 1 uppdercase letter");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      error_message.html("Password requires at least 1 lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      error_message.html("Password requires at least 1 number");
      return false;
    }
    if (password.length < 8) {
      error_message.html("Password must be at least 8 characters long");
      return false;
    }

    return true;
  };

  function request_register() {
    const errorMessage = $("#register_error");
    const username = $('input[name="register_username"]')[0].value;
    if (username === "") {
      errorMessage.html("Username required");
      return;
    }

    const email = $('input[name="email"]')[0].value;
    if (email === "") {
      errorMessage.html("Email required");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      errorMessage.html("Please enter valid email");
      return;
    }

    const password = $('input[name="register_password"]')[0].value;
    if (password === "" || !checkPassword(errorMessage)) {
      errorMessage.html("Password required");
      return;
    }

    const confirmPass = $('input[name="confirm-password"]')[0].value;
    if (password != confirmPass) {
      errorMessage.html("Passwords do not match");
      return;
    }
    const form = document.createElement("form");
    const arrayOf2DElements = [
      ["username", username],
      ["email", email],
      ["pass", password],
      ["confirm-pass", confirmPass]
    ];
    addOrderInformation(form, arrayOf2DElements);
    const formBeforeLoading = $("#register-login-section").html();
    $("#register-login-section").html(LOADING_HTML);
    $.get("/request_register/", $(form).serialize())
      .done(function(data) {
        if (data.hasOwnProperty("error")) {
          $("#register-login-section").html(formBeforeLoading);
          $("#register_error").html(data.error + " already exists");
        } else if (data.hasOwnProperty("pass_error")) {
          $("#register-login-section").html(formBeforeLoading);
          $("#register_error").html(data.pass_error);
        } else {
          $("#register-login-section").empty();
          $("#register-login-section").html(
            "<h4>Successfully registered! Username: <span style='color: #de4621;'>" +
              data.username +
              "</span></h4>"
          );
          convertNavBar();
          window.id = true;
        }
      })
      .fail(function(errorThrown) {
        $("#register-login-section").html(formBeforeLoading);
        alert(errorThrown);
      });
  }
  const PROCESSING_BUTTON =
    "<button class='button processing-button place-order-button'><span class='glyphicon glyphicon-repeat'></span></button>";
  const placeOrder = function() {
    const placeOrderButton = $("#place-order-button");
    const save_button = document.getElementById("place-order-button").innerHTML;
    const formBeforeLoading = $("#register-login-section").html();
    document.getElementById("place-order-button").innerHTML = LOADING_HTML;
    if (allRequiredFilled()) {
      createToken(placeOrderButton, save_button);
    } else {
      placeOrderButton.html(save_button);
    }
  };

  function allRequiredFilled() {
    let unsatisfiedFields = false;
    let errorMessage =
      '<h3>Required fields not satisfied:<span style="color:#de4621;">';
    if (!app.billingSame && !hasBillingAddress()) {
      errorMessage += "Must provided billing address";
      unsatisfiedFields = true;
    }
    $(".required").each(function(index, item) {
      if (item.value === "") {
        const itemName = item.name.replace("order", "");
        errorMessage += " " + itemName + ",";
        unsatisfiedFields = true;
      }
    });
    if (!unsatisfiedFields && !window.id) {
      errorMessage += "Must log in, register, or continue as guest,";
      unsatisfiedFields = true;
    }
    if (unsatisfiedFields) {
      $("#place-order-error")
        .removeClass("hidden")
        .html(errorMessage.slice(0, -1) + "</span></h3>");
      return false;
    } else {
      if (!$("#place-order-error").hasClass("hidden")) {
        $("#place-order-error").addClass("hidden");
      }
      return true;
    }
  }
  const addOrderInformation = function(createdForm, arrayOf2DElements) {
    arrayOf2DElements.forEach(function(element) {
      const hiddenInput = document.createElement("input");
      hiddenInput.setAttribute("type", "hidden");
      hiddenInput.setAttribute("name", element[0]);
      hiddenInput.setAttribute("value", element[1]);
      createdForm.appendChild(hiddenInput);
    });
  };
  const parseFoodCounter = function() {
    return JSON.stringify(app.foodCounter.cart);
  };
  const parseAddress = function() {
    const street = $('input[name="orderAddress"]')[0].value;
    const city = $('input[name="orderCity"]')[0].value;
    const zip = $('input[name="orderZipcode"]')[0].value;
    return `${street}, ${city} ${zip}`;
  };
  const hasBillingAddress = function() {
    return (
      $('input[name="billingAddress"]')[0].value === "" &&
      $('input[name="billingCity"]')[0].value === ""
    );
  };
  const getBillingAddress = function() {
    const billingObj = {};
    if (app.billingSame) {
      billingObj["street"] = $('input[name="orderAddress"]')[0].value;
      billingObj["city"] = $('input[name="orderCity"]')[0].value;
      billingObj["zip"] = $('input[name="orderZipcode"]')[0].value;
    } else {
      billingObj["street"] = $('input[name="billingAddress"]')[0].value;
      billingObj["city"] = $('input[name="billingCity"]')[0].value;
    }
    return JSON.stringify(billingObj);
  };
  const convertNavBar = function() {
    const LOG_OUT =
      '<a class="titles main-nav-item" href="/logout" >Log Out</a>';
    $("#nav-register").addClass("hidden");
    $("#nav-login").html(LOG_OUT);
  };
  $("#request-login").on("click", () => {
    request_login();
  });
  $("#request-register").on("click", () => {
    request_register();
  });
  $("#show-login").on("click", () => {
    showForm("login");
  });
  $("#show-register").on("click", () => {
    showForm("register");
  });
  $("#continue-as-guest").on("click", () => {
    continue_as_guest();
  });
  $("#place-order-button").on("click", () => {
    placeOrder();
  });
  $("#billingCheckbox").change(function() {
    app.billingSame = !app.billingSame;
    toggleHide("#billingFieldset");
  });
  function setInputFilter(textbox, inputFilter) {
    [
      "input",
      "keydown",
      "keyup",
      "mousedown",
      "mouseup",
      "select",
      "contextmenu",
      "drop"
    ].forEach(function(event) {
      $(textbox).on(event, function() {
        if (inputFilter(this.value)) {
          this.oldValue = this.value;
          this.oldSelectionStart = this.selectionStart;
          this.oldSelectionEnd = this.selectionEnd;
        } else if (this.hasOwnProperty("oldValue")) {
          this.value = this.oldValue;
          this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
        }
      });
    });
  }

  // Restrict input to digits and '.' by using a regular expression filter.
  const toEnforceInputs = $(".digits-only");
  $.each(toEnforceInputs, function(index, element) {
    setInputFilter(element, function(value) {
      return /^\d*\.?\d*$/.test(value);
    });
  });
};
window.addEventListener("click", function() {
  const paramsDictionary = {
    cart: app.foodCounter.cart,
    date: $("#datepicker").val()
  };
  urlEncodeParams(paramsDictionary);
});
