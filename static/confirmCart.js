 $(function(){
   sessionStorage.removeItem('order_placed')
  const decodeHTML = function (html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

// Custom styling can be passed to options when creating an Element.
// (Note that this demo uses a wider set of styles than the guide below.)
const style = {
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
const stripe = Stripe('pk_test_L8yMZPmXBR046Uxp2PzjT4O9');
// Create an instance of Elements.
const elements = stripe.elements();
// Create an instance of the card Element.
const card = elements.create('card', {style});
// Add an instance of the card Element into the `card-element` <div>.
card.mount('#card-element');

card.addEventListener('change', ({error}) => {
  const displayError = document.getElementById('card-errors');
  if (error) {
    displayError.textContent = error.message;
  } else {
    displayError.textContent = '';
  }
});
const createToken = function(placeOrderButton, changeBack) {
  stripe.createToken(card).then(function(result) {
    if (result.error) {
      // Inform the user if there was an error
      var errorElement = document.getElementById('card-errors');
      errorElement.textContent = result.error.message;
      placeOrderButton.html(changeBack)
    } else {
      // Send the token to your server
      stripeTokenHandler(result.token, placeOrderButton, changeBack);
    }
  });
};
function stripeTokenHandler(token, placeOrderButton, changeBack) {
  // Insert the token ID into the form so it gets submitted to the server
  const form = document.getElementById('payment-form');
  const hiddenInput = document.createElement('input');
  hiddenInput.setAttribute('type', 'hidden');
  hiddenInput.setAttribute('name', 'stripeToken');
  hiddenInput.setAttribute('value', token.id);
  form.appendChild(hiddenInput);
  // const orderInformation = getOrderInfoAsDictionary();
  addOrderInformation(form);
  $.post('/charge',  $(form).serialize() ).done(function( data ){
        if( data.hasOwnProperty('error') ){
          placeOrderButton.html(changeBack);
          alert('something went wrong ' + data.error);
        } else {
          location.href = '/order_placed/'
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
  function getVal(object, key, fallback){
    if( object.hasOwnProperty(key) ){
      return object[key]
    }else if( object.hasOwnProperty(fallback)) {
      return object[fallback]
    }else {
      return 1
    }
  }

  const foodCount = sessionStorage.getItem("foodCounter");
  window.foodCounter = JSON.parse(foodCount);

  const otherSettings = sessionStorage.getItem("otherSettings");
  window.selectedFoodOptions = JSON.parse(otherSettings);

  const size_rules = { "Half Pan" : 2, "Full Pan" : 4, '48 oz Container' : 1.5}
  const countConversions = { "Taco Tray": 24, "Burrito Tray": 8, "Nacho Bar" : 10, "Rotisserie Chicken" : 10};

  // console.log(typeof(prices));
  function convertPriced( listOfItemDicts ){
    const entreePrices = getVal(prices, "entrees");
    let total = 0;
    listOfItemDicts.forEach(function(value){
      // console.log(value)
      let itemName = getVal(value, 'name')
      if ( itemName == "Side Choices" ){
        itemName= getVal(value, 'side')
      }
      const itemFlavor = getVal(value, "flavor")
      const itemPortion = getVal(value, "portion", "size")
      // console.log(itemPortion)
      // console.log(itemPortion)

      let countNumberInTray = getVal(countConversions, itemName)
      countNumberInTray *= getVal(size_rules, itemPortion)

      const numberOfThisItemInCart = getVal(value, "count");
      countNumberInTray *= numberOfThisItemInCart;

      const rulesForItem = getVal(entreePrices, itemName)

      const pricePerItemName= getVal(rulesForItem, itemFlavor, "default");

      countNumberInTray *= pricePerItemName;

      const multiplierForPortionSize = getVal( size_rules, itemPortion)
      value.cost = "$" + countNumberInTray.toFixed(2);
      total += countNumberInTray;
    })
    // console.log(total)
    return total;
  }

  function setTotal(targetId, priceData = window.prices){
    let total = 0;

    const foodCounterKeys = Object.keys(foodCounter).filter(key => key !== 'total');

    for ( foodKey of foodCounterKeys){
      if ( foodCounter.hasOwnProperty(foodKey) ){
        const itemsOfKey = foodCounter[foodKey].items;
        total += convertPriced(itemsOfKey);
      }
    }
    $(targetId).html(" $" + total.toFixed(2))
  }
  function getPrices(){
    const pricesString = sessionStorage.getItem('entree_prices');
    if( typeof(pricesString) != typeof('string')){
      $.get('/get_prices/', function( data ) {
        prices = data;
        setTotal('#cart-total', data)
      });
    }else{
     prices = JSON.parse( pricesString )
     setTotal('#cart-total')
    }
  }
  getPrices();

  function toggleHide(tagId){
    if( !$(tagId).hasClass('hidden') ){
      $(tagId).addClass('hidden');
    }else{
      $(tagId).removeClass('hidden')
    }
  }
  const showForm = (formName) => {
    const wantedForm = ( formName === 'login') ? 'login' : 'register';
    const other = ( formName === 'login') ? 'register' : 'login';
    if( !$('#' + other + '-form').hasClass('hidden') ){
      $('#'+ other + '-form').addClass('hidden')
    }
    $('#' + wantedForm + '-form').removeClass('hidden')
    $('#' + other).removeClass('hidden')
    $('#' + wantedForm).addClass('hidden')

  }

  window.onload = function() {
    setPicker(sessionStorage.getItem("date"), sessionStorage.getItem('disabledDates'));

    let itemKeys = Object.keys(window.foodCounter);
    drawToSelection(itemKeys, "my_cart", "");
  };

  let numberOfPeople = sessionStorage.getItem("people");
  window.people = JSON.parse(numberOfPeople);

  function randomString(length, chars) {
    let result = '';
    for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }

  function continue_as_guest(){
      $.get('/guest_login/', function(){
        console.log('logging in as guest....')
      }).done(function( data ){
        if( data.hasOwnProperty('error') ){
          alert('something went wrong ' + data.error)
        }else{
          const confirmationCode = data.code;
          $('#register-login-section').empty();
          $('#register-login-section').html('<h4>Your Confirmation Code is: <span class="red-title">' + confirmationCode + '</span></h4>'+
                                      '<p>*Use this code for referencing your order in the future*</p>')
          window.id = true;
        }
      });
  }

  function request_login() {
    let username = $('input[name="login_username"]')[0].value;
    if (username === "") { $("#login_error").html("Username required to log in"); return false;}
    if ($('input[name="login_password"]')[0].value == "") { $("#login_error").html("Password required to log in"); return false; }
    $.get('/request_login/', { username : username, pass : $('input[name="login_password"]')[0].value}, function( data ){
      if ( data.hasOwnProperty('error') ){
        $('#login_error').html('error logging in');
      }else {
        $('#register-login-section').empty()
        $('#register-login-section').html("<h4>Succesful login! Username: <span style='color: #de4621;'>" + data.username + "</span></h4>");
        convertNavBar()
        window.id = true
      }
    }).fail(function( errorThrown ){
      alert(errorThrown);
    });
 }

  const checkPassword = function( error_message ){
    const password = $('input[name="register_password"]')[0].value;
    if( !/[A-Z]/.test(password)){ error_message.html('Password requires at least 1 uppdercase letter'); return false; }
    if( !/[a-z]/.test(password) ){ error_message.html('Password requires at least 1 lowercase letter'); return false; }
    if ( !/[0-9]/.test(password) ){ error_message.html('Password requires at least 1 number'); return false; }
    if ( password.length < 8 ){ error_message.html('Password must be at least 8 characters long'); return false; }

    return true;
  }

  function request_register(){
    const errorMessage = $("#register_error");
    const username = $('input[name="register_username"]')[0].value;
    if ( username === '') { errorMessage.html("Username required"); return;}

    const email = $('input[name="email"]')[0].value;
    if ( email === '' ){ errorMessage.html("Email required"); return;}
    if ( !email.includes('@') || !email.includes('.')){ errorMessage.html("Please enter valid email"); return;}

    const password = $('input[name="register_password"]')[0].value;
    if( password === '' || !checkPassword( errorMessage ) ){ errorMessage.html("Password required"); return;}

    const confirmPass = $('input[name="confirm-password"]')[0].value;
    if ( password != confirmPass){errorMessage.html("Passwords do not match");return;}
    $.get('/request_register/', {username : username, email : email, pass: password}, function(data){
      if( data.hasOwnProperty('error') ){
        $('#register_error').html(data.error + " already exists")
      }else if ( data.hasOwnProperty('pass_error')){
        $('#register_error').html(data.pass_error)
      } else {
        $('#register-login-section').empty()
        $('#register-login-section').html("<h4>Successfully registered! Username: <span style='color: #de4621;'>" + data.username + "</span></h4>");
        convertNavBar()
        window.id = true;
      }
    }).fail(function(errorThrown){
      alert(errorThrown)
    })
  }


  const backToMenu = function(){
    sessionStorage.setItem('CURRENT_PAGE', "3");
    sessionStorage.setItem("backFromCart", true);
    const foodCount = removeCostAndStringify(window.foodCounter);
    sessionStorage.setItem("foodCounter", foodCount);
    document.location.href = "/";
  };

  const removeCostAndStringify = function(foodCounter){
    const copy = JSON.parse(JSON.stringify(foodCounter));
    const keys = Object.keys(copy);
    for (const key of keys ){
      if( !copy.hasOwnProperty(key) ) continue;
      if (!copy[key].hasOwnProperty('items') ) continue;

      const items = copy[key]['items'];

      for ( let index = 0; index < items.length; index++ ){
        if ( copy[key]['items'][index].hasOwnProperty('cost')){
          delete copy[key]['items'][index].cost;
        }
      }
    }
    return JSON.stringify(copy);
  }

  const PROCESSING_BUTTON ="<button class='button processing-button place-order-button'><span class='glyphicon glyphicon-repeat'></span></button>";
  const placeOrder = function(){
    const placeOrderButton = $('#place-order-button');
    const save_button = document.getElementById('place-order-button').innerHTML;
    placeOrderButton.html(PROCESSING_BUTTON);
    if( allRequiredFilled() ){
      createToken(placeOrderButton, save_button);
    }else {
      placeOrderButton.html(save_button)
    }
  }


  function allRequiredFilled(){
    let unsatisfiedFields = false
    let errorMessage = '<h3>Required fields not satisfied:<span style="color:#de4621;">'
    $('.required').each(function(index, item){
      if( item.value === "" ){
        const itemName = item.name.replace("order", "");
        errorMessage += " " + itemName +","
        unsatisfiedFields = true;
      }
    })
    if ( !unsatisfiedFields && !window.id){
      errorMessage += "Must log in, register, or continue as guest,"
      unsatisfiedFields = true;
    }
    if( unsatisfiedFields ){
      $('#place-order-error').removeClass('hidden').html(errorMessage.slice(0, -1)+'</span></h3>');
      return false;
    }else {
      if( !$('#place-order-error').hasClass('hidden') ){
        $('#place-order-error').addClass('hidden')
      }
      return true;
    }
  }
  const addOrderInformation = function( createdForm ){
    [['name', $('input[name="orderName"]')[0].value ],
     ['date', $('#datepicker').val() ],
     ['phone', $('input[name="orderPhone"]')[0].value],
     ['email', $('input[name="orderEmail"]')[0].value],
     ['address', parseAddress()],
     ['order', parseFoodCounter()],
     ['notes', $('textarea[name="additional-comments"]')[0].value],
     ['id', window.id]].forEach(function(element){
      const hiddenInput = document.createElement('input');
      hiddenInput.setAttribute('type', 'hidden');
      hiddenInput.setAttribute('name', element[0]);
      hiddenInput.setAttribute('value', element[1]);
      createdForm.appendChild(hiddenInput);
     });

  }
  const parseAddress = function(){
    const street = $('input[name="orderAddress"]')[0].value;
    const city = $('input[name="orderCity"]')[0].value;
    const zip = $('input[name="orderZipcode"]')[0].value;
    return street + ", " + city + " " + zip;
  }

  const parseFoodCounter = function(){
    const foodCounterCopy = JSON.parse(JSON.stringify(foodCounter))
    for (const key of Object.keys(foodCounterCopy)) {
      if (foodCounterCopy.hasOwnProperty(key)) {
        if( foodCounterCopy[key].hasOwnProperty('items') ){
          delete foodCounterCopy[key].flavors
          if( foodCounterCopy[key].items.length === 0 ){
            delete foodCounterCopy[key];
          }
        }
      }
    }
    return JSON.stringify(foodCounter);
  }
  const convertNavBar = function(){
    const LOG_OUT = '<a class="titles main-nav-item" href="/logout" >Log Out</a>';
    $('#nav-register').addClass('hidden');
    $('#nav-login').html(LOG_OUT);
  }
  $('#request-login').on('click', ()=> {
    request_login();
  });
  $('#request-register').on('click', () => {
    request_register();
  });
  $('#show-login').on('click', () => {
    showForm("login");
  });
  $('#show-register').on('click', () => {
    showForm("register");
  });
  $('#continue-as-guest').on('click', () => {
    continue_as_guest();
  });
  $('#back-to-menu').on('click', () => {
    backToMenu()
  });
  $('#place-order').on('click', () => {
    placeOrder();
  })
});