'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

$(function () {
  sessionStorage.removeItem('order_placed');
  var decodeHTML = function decodeHTML(html) {
    var txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  // Custom styling can be passed to options when creating an Element.
  // (Note that this demo uses a wider set of styles than the guide below.)
  var style = {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  };
  // Create a Stripe client.
  var stripe = Stripe('pk_test_L8yMZPmXBR046Uxp2PzjT4O9');
  // Create an instance of Elements.
  var elements = stripe.elements();
  // Create an instance of the card Element.
  var card = elements.create('card', { style: style });
  // Add an instance of the card Element into the `card-element` <div>.
  card.mount('#card-element');

  card.addEventListener('change', function (_ref) {
    var error = _ref.error;

    var displayError = document.getElementById('card-errors');
    if (error) {
      displayError.textContent = error.message;
    } else {
      displayError.textContent = '';
    }
  });
  var createToken = function createToken(placeOrderButton, changeBack) {
    stripe.createToken(card).then(function (result) {
      if (result.error) {
        // Inform the user if there was an error
        var errorElement = document.getElementById('card-errors');
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
    var form = document.getElementById('payment-form');
    var hiddenInput = document.createElement('input');
    hiddenInput.setAttribute('type', 'hidden');
    hiddenInput.setAttribute('name', 'stripeToken');
    hiddenInput.setAttribute('value', token.id);
    form.appendChild(hiddenInput);
    // const orderInformation = getOrderInfoAsDictionary();
    addOrderInformation(form);
    $.post('/charge', $(form).serialize()).done(function (data) {
      if (data.hasOwnProperty('error')) {
        placeOrderButton.html(changeBack);
        alert('something went wrong ' + data.error);
      } else {
        location.href = '/order_placed/';
      }
    });
    // Submit the form
    // form.submit();
  }
  // Create a token when the form is submitted.
  // var form = document.getElementById('payment-form');
  // form.addEventListener('submit', function(e) {
  //   e.preventDefault();

  // });
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
  function getPrices() {
    var pricesString = sessionStorage.getItem('entree_prices');
    if ((typeof pricesString === 'undefined' ? 'undefined' : _typeof(pricesString)) != _typeof('string')) {
      $.get('/get_prices/', function (data) {
        window.prices = data;
        setTotal('#cart-total', data);
      });
    } else {
      window.prices = JSON.parse(pricesString);
      setTotal('#cart-total');
    }
  }
  getPrices();

  function toggleHide(tagId) {
    if (!$(tagId).hasClass('hidden')) {
      $(tagId).addClass('hidden');
    } else {
      $(tagId).removeClass('hidden');
    }
  }
  var showForm = function showForm(formName) {
    var wantedForm = formName === 'login' ? 'login' : 'register';
    var other = formName === 'login' ? 'register' : 'login';
    if (!$('#' + other + '-form').hasClass('hidden')) {
      $('#' + other + '-form').addClass('hidden');
    }
    $('#' + wantedForm + '-form').removeClass('hidden');
    $('#' + other).removeClass('hidden');
    $('#' + wantedForm).addClass('hidden');
  };

  window.onload = function () {
    setPicker(sessionStorage.getItem("date"), sessionStorage.getItem('disabledDates'));

    var itemKeys = Object.keys(window.foodCounter);
    drawToSelection(itemKeys, "my_cart", "");
  };

  var numberOfPeople = sessionStorage.getItem("people");
  window.people = JSON.parse(numberOfPeople);

  function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }return result;
  }

  function continue_as_guest() {
    $.get('/guest_login/', function () {
      console.log('logging in as guest....');
    }).done(function (data) {
      if (data.hasOwnProperty('error')) {
        alert('something went wrong ' + data.error);
      } else {
        var confirmationCode = data.code;
        $('#register-login-section').empty();
        $('#register-login-section').html('<h4>Your Confirmation Code is: <span class="red-title">' + confirmationCode + '</span></h4>' + '<p>*Use this code for referencing your order in the future*</p>');
        window.id = true;
      }
    });
  }

  function request_login() {
    var username = $('input[name="login_username"]')[0].value;
    if (username === "") {
      $("#login_error").html("Username required to log in");return false;
    }
    if ($('input[name="login_password"]')[0].value == "") {
      $("#login_error").html("Password required to log in");return false;
    }
    $.get('/request_login/', { username: username, pass: $('input[name="login_password"]')[0].value }, function (data) {
      if (data.hasOwnProperty('error')) {
        $('#login_error').html('error logging in');
      } else {
        $('#register-login-section').empty();
        $('#register-login-section').html("<h4>Succesful login! Username: <span style='color: #de4621;'>" + data.username + "</span></h4>");
        convertNavBar();
        window.id = true;
      }
    }).fail(function (errorThrown) {
      alert(errorThrown);
    });
  }

  var checkPassword = function checkPassword(error_message) {
    var password = $('input[name="register_password"]')[0].value;
    if (!/[A-Z]/.test(password)) {
      error_message.html('Password requires at least 1 uppdercase letter');return false;
    }
    if (!/[a-z]/.test(password)) {
      error_message.html('Password requires at least 1 lowercase letter');return false;
    }
    if (!/[0-9]/.test(password)) {
      error_message.html('Password requires at least 1 number');return false;
    }
    if (password.length < 8) {
      error_message.html('Password must be at least 8 characters long');return false;
    }

    return true;
  };

  function request_register() {
    var errorMessage = $("#register_error");
    var username = $('input[name="register_username"]')[0].value;
    if (username === '') {
      errorMessage.html("Username required");return;
    }

    var email = $('input[name="email"]')[0].value;
    if (email === '') {
      errorMessage.html("Email required");return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      errorMessage.html("Please enter valid email");return;
    }

    var password = $('input[name="register_password"]')[0].value;
    if (password === '' || !checkPassword(errorMessage)) {
      errorMessage.html("Password required");return;
    }

    var confirmPass = $('input[name="confirm-password"]')[0].value;
    if (password != confirmPass) {
      errorMessage.html("Passwords do not match");return;
    }
    $.get('/request_register/', { username: username, email: email, pass: password }, function (data) {
      if (data.hasOwnProperty('error')) {
        $('#register_error').html(data.error + " already exists");
      } else if (data.hasOwnProperty('pass_error')) {
        $('#register_error').html(data.pass_error);
      } else {
        $('#register-login-section').empty();
        $('#register-login-section').html("<h4>Successfully registered! Username: <span style='color: #de4621;'>" + data.username + "</span></h4>");
        convertNavBar();
        window.id = true;
      }
    }).fail(function (errorThrown) {
      alert(errorThrown);
    });
  }

  var backToMenu = function backToMenu() {
    sessionStorage.setItem('CURRENT_PAGE', "3");
    sessionStorage.setItem("backFromCart", true);
    var foodCount = removeCostAndStringify(window.foodCounter);
    sessionStorage.setItem("foodCounter", foodCount);
    document.location.href = "/";
  };

  var removeCostAndStringify = function removeCostAndStringify(foodCounter) {
    var copy = JSON.parse(JSON.stringify(foodCounter));
    var keys = Object.keys(copy);
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = keys[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var key = _step2.value;

        if (!copy.hasOwnProperty(key)) continue;
        if (!copy[key].hasOwnProperty('items')) continue;

        var items = copy[key]['items'];

        for (var index = 0; index < items.length; index++) {
          if (copy[key]['items'][index].hasOwnProperty('cost')) {
            delete copy[key]['items'][index].cost;
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

    return JSON.stringify(copy);
  };

  var PROCESSING_BUTTON = "<button class='button processing-button place-order-button'><span class='glyphicon glyphicon-repeat'></span></button>";
  var placeOrder = function placeOrder() {
    var placeOrderButton = $('#place-order-button');
    var save_button = document.getElementById('place-order-button').innerHTML;
    placeOrderButton.html(PROCESSING_BUTTON);
    if (allRequiredFilled()) {
      createToken(placeOrderButton, save_button);
    } else {
      placeOrderButton.html(save_button);
    }
  };

  function allRequiredFilled() {
    var unsatisfiedFields = false;
    var errorMessage = '<h3>Required fields not satisfied:<span style="color:#de4621;">';
    $('.required').each(function (index, item) {
      if (item.value === "") {
        var itemName = item.name.replace("order", "");
        errorMessage += " " + itemName + ",";
        unsatisfiedFields = true;
      }
    });
    if (!unsatisfiedFields && !window.id) {
      errorMessage += "Must log in, register, or continue as guest,";
      unsatisfiedFields = true;
    }
    if (unsatisfiedFields) {
      $('#place-order-error').removeClass('hidden').html(errorMessage.slice(0, -1) + '</span></h3>');
      return false;
    } else {
      if (!$('#place-order-error').hasClass('hidden')) {
        $('#place-order-error').addClass('hidden');
      }
      return true;
    }
  }
  var addOrderInformation = function addOrderInformation(createdForm) {
    [['name', $('input[name="orderName"]')[0].value], ['date', $('#datepicker').val()], ['phone', $('input[name="orderPhone"]')[0].value], ['email', $('input[name="orderEmail"]')[0].value], ['address', parseAddress()], ['order', parseFoodCounter()], ['notes', $('textarea[name="additional-comments"]')[0].value], ['id', window.id]].forEach(function (element) {
      var hiddenInput = document.createElement('input');
      hiddenInput.setAttribute('type', 'hidden');
      hiddenInput.setAttribute('name', element[0]);
      hiddenInput.setAttribute('value', element[1]);
      createdForm.appendChild(hiddenInput);
    });
  };
  var parseAddress = function parseAddress() {
    var street = $('input[name="orderAddress"]')[0].value;
    var city = $('input[name="orderCity"]')[0].value;
    var zip = $('input[name="orderZipcode"]')[0].value;
    return street + ", " + city + " " + zip;
  };

  var parseFoodCounter = function parseFoodCounter() {
    var foodCounterCopy = JSON.parse(JSON.stringify(foodCounter));
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = Object.keys(foodCounterCopy)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var key = _step3.value;

        if (foodCounterCopy.hasOwnProperty(key)) {
          if (foodCounterCopy[key].hasOwnProperty('items')) {
            delete foodCounterCopy[key].flavors;
            if (foodCounterCopy[key].items.length === 0) {
              delete foodCounterCopy[key];
            }
          }
        }
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }

    return JSON.stringify(foodCounter);
  };
  var convertNavBar = function convertNavBar() {
    var LOG_OUT = '<a class="titles main-nav-item" href="/logout" >Log Out</a>';
    $('#nav-register').addClass('hidden');
    $('#nav-login').html(LOG_OUT);
  };
  $('#request-login').on('click', function () {
    request_login();
  });
  $('#request-register').on('click', function () {
    request_register();
  });
  $('#show-login').on('click', function () {
    showForm("login");
  });
  $('#show-register').on('click', function () {
    showForm("register");
  });
  $('#continue-as-guest').on('click', function () {
    continue_as_guest();
  });
  $('#back-to-menu').on('click', function () {
    backToMenu();
  });
  $('#place-order-button').on('click', function () {
    placeOrder();
  });
});
