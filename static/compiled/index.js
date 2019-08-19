function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var urlEncode = function urlEncode(paramDictionary) {
  window.history.replaceState({}, "", "?" + encodeURIComponent(JSON.stringify(paramDictionary)));
};

var MOBILE_MODE = window.innerWidth <= 767;
var paramsToEncode = {};

if (sessionStorage.getItem("cart") != undefined) {
  paramsToEncode["cart"] = JSON.parse(sessionStorage.getItem('cart'));

  if (sessionStorage.getItem("date") != undefined) {
    paramsToEncode["date"] = sessionStorage.getItem('date');
  }

  urlEncode(paramsToEncode);
}

var urlDecode = function urlDecode() {
  var urlSearchString = window.location.search;
  if (!urlSearchString.includes("?")) return {};

  try {
    var paramDictionary = JSON.parse(decodeURIComponent(urlSearchString.replace("?", "")));
    return paramDictionary;
  } catch (_unused) {
    window.history.replaceState({}, "", "");
    return {};
  }
};

var MAIN_MODAL_CONTENT = "<h2> ItemNamePlaceholder: </h2>" + "<p> HeaderPlaceholder </p>" + "<div class='selection row'> SelectionPlaceholder <div id='addToCart'" + "class='col-xs-2 col-xs-offset-8 add-select'>Add to cart</div></div>" + '<div class="row modal-add-to-order">namePlaceholder\'s in your cart: </div><div id="idPlaceholder"' + ' class="row"></div><div class="button button1" id="done-selection">Done</div>';
var ADD_MORE_MESSAGE = '<span class="tooltiptext">' + "Based on your number of people, we recommend the current cart limit. <br/> " + "But you can click here to increase the size of your cart!" + "</span></div>";
var AT_ORDER_LIMIT_DIV = '<div id="limit-message"style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1">' + 'Currently at order limit <div id="add-more" class="button button1 want-more-button">Want to add to order?' + ADD_MORE_MESSAGE + "</div>";
var AT_FLAVOR_LIMIT_DIV = '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1"> Sorry, you have reached the max number of unique flavors for item</div>';
var PICK_NUMBER_MORE_ITEMS = '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1">( Select numberPlaceholder more entrees )</div>';
var ITEM_HTML_FOR_LIST = `<tr><td class='count-column'><span class="span increase" id="appendValuePlaceholder"> + </span> countPlaceholder <span class="span decrease" id="appendValuePlaceholder"> - </span></td>`;
var DEFAULT_MIN = 8;

var setAppMaxItems = function setAppMaxItems(app) {
  var numGuests;
  var numAdults = $('#numAdults').val();
  var numKids = $('#numKids').val();
  if (numAdults === '') numAdults = 0;
  if (numKids === '') numKids = 0;

  if (isNaN(numAdults) || isNaN(numKids)) {
    app.validGuests = false;
  } else {
    if (numAdults + numKids === 0) {
      app.validGuests = false;
      return;
    }

    app.environ.Adults = parseInt(numAdults);
    app.environ.Kids = parseInt(numKids);

    if (app.environ.Kids + app.environ.Adults >= 8 && 0.5 * app.environ.Kids + app.environ.Adults < 8) {
      numGuests = 8;
    } else {
      numGuests = 0.5 * app.environ.Kids + app.environ.Adults;
    }

    app.maxItems = Math.ceil(numGuests / parseInt(DEFAULT_MIN));
    var numberRec = $('#number-rec');

    if (numberRec.html() !== '') {
      numberRec.html("For ".concat(app.environ.Adults, " adults").concat(app.environ.Kids != 0 ? " and ".concat(app.environ.Kids, " kids") : '', ", we recommoned ").concat(app.maxItems, " entrees of the smallest size."));
    }

    app.validGuests = true;
  }
};

function MenuItem(itemDictionary) {
  this.environ = itemDictionary;
  this.notSelectKeys = new Set(["name", "description", "_id", "type"]);
  this.toLimit = new Set(["Entree", "entree"]);

  this.button = function () {
    if (!MOBILE_MODE) {
      return "<div id=\"".concat(this.getId(), "\"\n                    class=\"entree-item col-xs-10 col-xs-offset-1 entree-options\">\n               <h3 style='text-align:left;    margin-top: 5px;'>").concat(this.environ.name, "</h3>\n                      <div>").concat(this.getDescriptionList(), "</div>\n                    </div>");
    }

    return "<div id=\"".concat(this.getId(), "\"\n                    class=\"entree-item col-xs-12 entree-options\">\n                      ").concat(this.environ.name, "\n                  </div>");
  };

  this.getId = function () {
    return this.environ.name.replace(/\s/g, '-').replace("&", "and");
  };

  this.target = function () {
    return "#" + this.environ.type.toLowerCase();
  };

  this.getModalContent = function (help) {
    var content = MAIN_MODAL_CONTENT.replace("ItemNamePlaceholder", this.environ.name).replace("HeaderPlaceholder", this.getHeader()).replace("SelectionPlaceholder", this.getSelection(help)).replace("namePlaceholder", this.environ.name).replace("idPlaceholder", "modal-cart");
    return content;
  };

  this.getSelection = function (help) {
    var content = "";

    for (var key in this.environ) {
      if (this.notSelectKeys.has(key)) {
        continue;
      }

      if (this.environ.hasOwnProperty(key) && this.environ[key].length > 1) {
        content += this.getSelectDiv(key, this.environ[key], help);
      }
    }

    return content;
  };

  this.getSelectDiv = function (key, array, help) {
    if (!_typeof(array)) {
      return "";
    }

    key = this.trimKey(key);
    var content = "<div class='col-xs-10 choose-option'> Choose ".concat(key, " :  <select class='select-setting'>"); // if asking for help, and the item is of entree type, and the key is the size. only return option for the smallest size

    if (help && this.toLimit.has(this.environ.type) && key == 'size') {
      var sizeKey = this.environ.hasOwnProperty("sizes") ? 'sizes' : 'size';
      var currentLargestSize = Math.min.apply(Math, this.environ[sizeKey].map(function (object) {
        return object.Count;
      }));
      var value = this.environ[sizeKey].find(function (object) {
        return object.Count == currentLargestSize;
      });
      return content + "<option value='".concat(key, "'>").concat(value.name.trim(), "</option></select></div>");
    }

    $.each(array, function (index, value) {
      if (_typeof(value) == 'object' && value.hasOwnProperty('name')) {
        value = value.name;
      }

      content += "<option value='".concat(key, "'>").concat(value.trim(), "</option>");
    });
    content += "</select></div>";
    return content;
  };

  this.trimKey = function (key) {
    if (key.slice(-1) == "s") {
      key = key.slice(0, -1);
    }

    return key;
  };

  this.getDescriptionList = function () {
    var description = "<ul>";

    if (this.environ.hasOwnProperty("description")) {
      if (this.environ.description.length > 0) {
        $.each(this.environ.description, function (index, element) {
          description += "<li>".concat(element, "</li>");
        });
      }
    }

    return description;
  };

  this.getHeader = function () {
    if (MOBILE_MODE) {
      return this.getDescriptionList() + '</ul><p class="please-select-from">Please choose from options:</p>';
    } else {
      return '</ul><p class="please-select-from">Please choose from options:</p>';
    }
  };
}

function FoodCounter(cart, app) {
  this.cart = cart;
  this.toLimit = new Set(["Entree", "entree"]);
  this.parentApp = app;
  this.possibleSizeKeys = ['size', 'sizes', 'portion', 'portions'];

  this.addItemToCart = function (itemToAdd) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = this.cart[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var itemInCart = _step.value;

        // if item is the same as another item except for the count, append 1 to the count.
        if (objectsAreEqual(itemInCart, itemToAdd, ['count'])) {
          itemInCart.count = itemInCart.count + 1;
          return;
        }
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return != null) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    this.cart.push(itemToAdd);
  };
  this.getListFromItem = function (itemObject) {
    var string = '';
    var keys = Object.keys(itemObject);

    for (var _i = 0, _keys = keys; _i < _keys.length; _i++) {
      var key = _keys[_i];
      string += "-" + itemObject[key];
    }

    return string;
  };

  this.getHtmlForItem = function (itemObject, index) {
    var appendValueParams = index.toString();
    var newDiv = ITEM_HTML_FOR_LIST.replace(/appendValuePlaceholder/g, appendValueParams).replace("countPlaceholder", itemObject.count);
    newDiv += "<td>".concat(itemObject.name, " - ").concat(itemObject.size, "</td></tr>");
    function deepCopy(object) {
      return JSON.parse(JSON.stringify(object));
    }
    var copyObject = deepCopy(itemObject);
    delete copyObject["name"];
    delete copyObject["size"];
    delete copyObject["count"];
    newDiv += "<tr><td></td><td class='cart-item-description'>".concat(this.getListFromItem(copyObject), "</td></tr>");

    // for (var key in itemObject) {
    //   if (key === "cost") {
    //     newDiv += "<small class=\"my-cart-key\" >".concat(itemObject[key], "\"</small>,");
    //   } else if (key != "count") {
    //     newDiv += "<span class=\"my-cart-key\"> ".concat(itemObject[key], "</span><strong class=\"order-keys\"> | </strong>");
    //   }
    // }

    return newDiv //+ "</div>";
  };

  this.toString = function () {
    var itemName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var cartToString = "<table id='cart-table'><tbody>";
    var self = this;
    this.cart.forEach(function (itemInCart, index) {
      if (!itemName || itemInCart.name == itemName) {
        cartToString += self.getHtmlForItem(itemInCart, index);
      }
    });
    return cartToString + "</tbody></table>";
  };

  this.canAddItemToCart = function (selectionItemObject, maxFlavors, maxItems, type, help) {
    if (!this.toLimit.has(type) || !this.parentApp.help) {
      return true;
    }

    maxFlavors = Math.min(maxFlavors, maxItems);

    if (this.alreadyAtMaxFlavorLimit(selectionItemObject, maxFlavors)) {
      return false;
    } else if (!help) {
      return true;
    }

    var toLimitCount = this.getCountOfItemsToLimit();

    if (toLimitCount >= maxItems) {
      return false;
    }

    return true;
  };

  this.getAddToCartError = function (selectionItemObject, maxFlavors, maxItems) {
    maxFlavors = Math.min(maxFlavors, maxItems);

    if (this.alreadyAtMaxFlavorLimit(selectionItemObject, maxFlavors)) {
      return AT_FLAVOR_LIMIT_DIV;
    }

    var toLimitCount = this.getCountOfItemsToLimit();

    if (toLimitCount >= maxItems && this.parentApp.help) {
      return AT_ORDER_LIMIT_DIV;
    }

    return "";
  };

  this.pickNumberOfItemsMessage = function (maxItems, help) {
    if (help) {
      var numberOfItemsToPick = maxItems - this.getCountOfItemsToLimit();
      return PICK_NUMBER_MORE_ITEMS.replace("numberPlaceholder", numberOfItemsToPick.toString());
    } else {
      return "";
    }
  };

  this.getCountOfItemsToLimit = function () {
    var count = 0;
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = this.cart[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var itemInCart = _step2.value;

        if (this.toLimit.has(itemInCart.type)) {
          count += itemInCart.count;
        }
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return count;
  };

  this.alreadyAtMaxFlavorLimit = function (itemObj, appMaxFlavors) {
    var countedFlavors = new Set([itemObj.flavor]);
    var flavorCount = 1;
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = this.cart[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var itemInCart = _step3.value;

        if (!itemInCart.hasOwnProperty("flavor") || countedFlavors.has(itemInCart.flavor)) {
          continue;
        }

        if (itemInCart.name === itemObj.name) {
          if (flavorCount == appMaxFlavors) {
            return true;
          }

          countedFlavors.add(itemInCart.flavor);
          flavorCount = flavorCount + 1;
        }
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return != null) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }

    return false;
  };
  this.countItems = function(){
    var total = 0;
    for ( var i = 0 ; i < this.cart.length; i++ ){
      total += this.cart[i].count;
    }
    return total;
  }
}

function App(cart, menu) {
  this.menu = {};
  var _iteratorNormalCompletion4 = true;
  var _didIteratorError4 = false;
  var _iteratorError4 = undefined;

  try {
    for (var _iterator4 = menu[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      var menuItem = _step4.value;
      this.menu[menuItem.name] = new MenuItem(menuItem);
    }
  } catch (err) {
    _didIteratorError4 = true;
    _iteratorError4 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion4 && _iterator4.return != null) {
        _iterator4.return();
      }
    } finally {
      if (_didIteratorError4) {
        throw _iteratorError4;
      }
    }
  }

  this.toLimit = new Set(["Entree", "entree"]);
  this.foodCounter = new FoodCounter(cart, this);
  this.maxItems = 20;
  this.maxFlavors = 4;
  this.currentItem = '';
  this.help = false;
  this.validGuests = false;
  this.environ = {};

  this.run = function () {
    var _this = this;
    this.showSelectedFood('#my-cart');

    var _loop = function _loop(menuItem) {
      var menuClass = _this.menu[menuItem];
      $(menuClass.target()).append(menuClass.button());
      var MyApp = _this;
      $("#" + menuClass.getId()).on('click', function () {
        var itemName = menuClass.environ.name;
        MyApp.currentItem = itemName;
        var type = MyApp.menu[itemName].environ.type; // create modal

        createModal('#modalHolder', menuClass.getModalContent(MyApp.help)); // show current items of this in cart to modal

        MyApp.showSelectedFood('#modal-cart', itemName);
        MyApp.attachAddToCartControlls(itemName, type);
        var close = document.getElementsByClassName('close')[0];
        close.addEventListener('click', function () {
          MyApp.currentItem = '';
          MyApp.showSelectedFood('#my-cart');
        });
      });
    };

    for (var menuItem in this.menu) {
      _loop(menuItem);
    }
  };

  this.showSelectedFood = function (idOfTarget) {
    var itemName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
    var errorMessage = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
    var MyApp = this; // draw the selection to the cart

    var showSelectedFood = errorMessage + this.foodCounter.pickNumberOfItemsMessage(this.maxItems, this.help);

    if (this.currentItem != '' && !this.toLimit.has(this.menu[this.currentItem].environ.type)) {
      showSelectedFood = '';
    }
    $("#cart-count").html(this.foodCounter.countItems());
    showSelectedFood += this.foodCounter.toString(itemName);
    $(idOfTarget).html(showSelectedFood); // add controllers for the increase count and decrease count

    var incButtons = document.getElementsByClassName("increase");

    for (var x = 0; x < incButtons.length; x++) {
      incButtons[x].addEventListener("click", function () {
        // MyApp.foodCounter.cart[this.id].count += 1;
        var selectionItemObject = deepCopy(MyApp.foodCounter.cart[this.id]);
        selectionItemObject.count = 1;
        var errorMessage = '';
        var targetId = '#my-cart';

        if (MyApp.foodCounter.canAddItemToCart(selectionItemObject, MyApp.maxFlavors, MyApp.maxItems, selectionItemObject.type, MyApp.help)) {
          // add the item to the card and re draw selection.
          MyApp.foodCounter.addItemToCart(selectionItemObject);
        } // only show error if the item type is type to limit number.


        if (MyApp.toLimit.has(selectionItemObject.type)) {
          errorMessage = MyApp.foodCounter.getAddToCartError(selectionItemObject, MyApp.maxFlavors, MyApp.maxItems);
        }

        if ($("#modal-cart").html() != undefined) {
          targetId = "#modal-cart";
        }

        MyApp.showSelectedFood(targetId, itemName, errorMessage);

        if (errorMessage.includes("cart limit")) {
          attachAddMore();
        }
      });
    }

    var decButtons = document.getElementsByClassName("decrease");

    for (var _x = 0; _x < decButtons.length; _x++) {
      decButtons[_x].addEventListener("click", function () {
        MyApp.foodCounter.cart[this.id].count -= 1; // if the count for this item goes to 0, remove it from the cart.

        if (MyApp.foodCounter.cart[this.id].count == 0) {
          MyApp.foodCounter.cart.splice(this.id, 1);
        }

        MyApp.showSelectedFood(idOfTarget, itemName);
      });
    }
  };

  this.attachAddToCartControlls = function (itemName, type) {
    var MyApp = this;
    $("#addToCart").on('click', function () {
      // create item object.
      var selectionItemObject = getSelectedOptions(itemName, type); // if can add it to cart

      if (MyApp.foodCounter.canAddItemToCart(selectionItemObject, MyApp.maxFlavors, MyApp.maxItems, type, MyApp.help)) {
        // add the item to the card and re draw selection.
        MyApp.foodCounter.addItemToCart(selectionItemObject);
        MyApp.showSelectedFood('#modal-cart', itemName);
      } else {
        var errorMessage = MyApp.foodCounter.getAddToCartError(selectionItemObject, MyApp.maxFlavors, MyApp.maxItems);
        MyApp.showSelectedFood('#modal-cart', itemName, errorMessage);

        if (errorMessage.includes("cart limit")) {
          attachAddMore();
        }
      }
    });
  };
}

var getSelectedOptions = function getSelectedOptions(nameOfItem, itemType) {
  var $selected = $(".select-setting");
  var thisItem = {
    count: 1,
    name: nameOfItem,
    type: itemType
  };
  $.each($selected, function (index, value) {
    thisItem[$(value).find("option:selected").val().trim()] = $(value).find("option:selected").text().trim();
  });
  return thisItem;
};

var cart = [];
var urlParams = urlDecode();

if (urlParams.hasOwnProperty("cart")) {
  cart = urlParams["cart"];
}

if (urlParams.hasOwnProperty("adults")) {
  $("#numAdults").val(urlParams['adults']);
}

if (urlParams.hasOwnProperty("kids")) {
  $("#numKids").val(urlParams["kids"]);
}

var app = new App(cart, {{ menu |tojson }});
app.run();

var attachAddMore = function attachAddMore() {
  $("#add-more").on('click', function () {
    app.maxItems += 1;

    if ($("#modal-cart").html() == undefined) {
      app.showSelectedFood('#my-cart');
    } else {
      app.showSelectedFood('#modal-cart', app.currentItem);
    }
  });
};

$('#checkoutButton').on('click', function () {
  var date = $('#datepicker').val();

  if (date == "" || date == "None") {
    alert("Please select a date before continuing to check out.");
  } else if (app.foodCounter.cart.length === 0) {
    alert("There doesn't seem to be anything in your cart.");
  } else {
    sessionStorage.setItem("date", date);
    sessionStorage.setItem("cart", JSON.stringify(app.foodCounter.cart));
    location.href = "/confirmCart";
  }
});
$('#numAdults').on('input', function () {
  var paramsDictionary = {
    "cart": app.foodCounter.cart,
    "adults": $('#numAdults').val(),
    "kids": $('#numKids').val(),
    "date": $('#datepicker').val()
  };
  urlEncodeParams(paramsDictionary);
  setAppMaxItems(app);
});
$('#numKids').on('input', function () {
  var paramsDictionary = {
    "cart": app.foodCounter.cart,
    "adults": $('#numAdults').val(),
    "kids": $('#numKids').val(),
    "date": $('#datepicker').val()
  };
  urlEncodeParams(paramsDictionary);
  setAppMaxItems(app);
});
setAppMaxItems(app);
$('#amount-help').on('click', function () {
  if (app.help == false && app.validGuests == false) {
    alert('Please enter a valid number of guests.');
  } else {
    var numberRec = $("#number-rec");

    if (numberRec.html() === '') {
      numberRec.html("For ".concat(app.environ.Adults, " adults").concat(app.environ.Kids != 0 ? " and ".concat(app.environ.Kids, " kids") : '', ", we recommoned ").concat(app.maxItems, " entrees of the smallest size."));
    } else {
      numberRec.empty();
    }

    app.help = !app.help; // set the url encoding search string //

    var paramsDictionary = {
      "help": app.help,
      "cart": app.foodCounter.cart,
      "adults": $('#numAdults').val(),
      "kids": $('#numKids').val(),
      "date": $('#datepicker').val()
    };
    urlEncodeParams(paramsDictionary); /////////////////////////////////////////////

    app.foodCounter.cart = reverseResolutionOfItems(app.foodCounter.cart, app.help);
    app.showSelectedFood('#my-cart');
    $('#amount-help').toggleClass(function () {
      return 'focused-button';
    });
  }
});

var reverseResolutionOfItems = function reverseResolutionOfItems(orginalCart, help) {
  var newCart = [];
  orginalCart.forEach(function (element) {
    if (hasCountProperty(element)) {
      var arrayOfResolution = help ? convertToSmallerSizes(element) : convertToLargerSizes(element);
      arrayOfResolution.forEach(function (newResItem) {
        newCart.push(newResItem);
      });
    } else {
      newCart.push(element);
    }
  });
  return reconcileCart(newCart);
};

var reconcileCart = function reconcileCart(oldCart) {
  for (var curIndex = 0; curIndex < oldCart.length; curIndex++) {
    for (var checkIndex = curIndex + 1; checkIndex < oldCart.length; checkIndex++) {
      if (objectsAreEqual(oldCart[curIndex], oldCart[checkIndex], ['count'])) {
        oldCart[curIndex].count += oldCart[checkIndex].count;
        oldCart.splice(checkIndex, 1);
        checkIndex -= 1;
      }
    }
  }

  return oldCart;
};

var hasCountProperty = function hasCountProperty(name) {
  var _iteratorNormalCompletion5 = true;
  var _didIteratorError5 = false;
  var _iteratorError5 = undefined;

  try {
    for (var _iterator5 = app.foodCounter.possibleSizeKeys[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
      var sizeKey = _step5.value;

      if (app.menu[name.name].environ.hasOwnProperty(sizeKey)) {
        // console.log( this.parentApp.menu[name.name][sizeKey][0]);
        if (app.menu[name.name].environ[sizeKey][0].hasOwnProperty("Count") || app.menu[name.name].environ[sizeKey][0].hasOwnProperty("count")) {
          return true;
        }
      }
    }
  } catch (err) {
    _didIteratorError5 = true;
    _iteratorError5 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion5 && _iterator5.return != null) {
        _iterator5.return();
      }
    } finally {
      if (_didIteratorError5) {
        throw _iteratorError5;
      }
    }
  }

  return false;
};

var convertToSmallerSizes = function convertToSmallerSizes(itemObject) {
  var newResArray = [];
  var sizeKey = itemObject.hasOwnProperty("size") ? "size" : "portion";
  var itemSize = itemObject[sizeKey];
  var arrayOfItemSizes = app.menu[itemObject.name].environ.sizes;
  var minSize = {
    'Count': 100
  };
  arrayOfItemSizes.forEach(function (object) {
    if (parseInt(object.Count) < minSize.Count) {
      minSize = object;
    }
  });
  var thisItemCount = arrayOfItemSizes.find(function (element) {
    return element.name == itemSize;
  });
  var copyOfItem = deepCopy(itemObject);
  copyOfItem[sizeKey] = minSize.name;
  copyOfItem['count'] = parseInt(thisItemCount.Count) / parseInt(minSize.Count) * itemObject.count;
  newResArray.push(copyOfItem);
  return newResArray;
};

var convertToLargerSizes = function convertToLargerSizes(itemObject) {
  var newResArray = [];
  var sizeKey = itemObject.hasOwnProperty("size") ? "size" : "portion";
  var itemSize = itemObject[sizeKey];
  var copyOfSizes = deepCopy(app.menu[itemObject.name].environ.sizes);
  var thisItemCount = copyOfSizes.find(function (element) {
    return element.name == itemSize;
  });
  var totalPieces = parseInt(thisItemCount.Count) * itemObject.count;

  var _loop2 = function _loop2() {
    var currentLargestSize = Math.max.apply(Math, copyOfSizes.map(function (object) {
      return object.Count;
    }));
    var sizeObjectWithCurrentLargestSize = copyOfSizes.find(function (object) {
      return object.Count == currentLargestSize;
    });

    if (totalPieces >= sizeObjectWithCurrentLargestSize.Count) {
      var newItem = deepCopy(itemObject);
      newItem.count = 0;
      newItem.size = sizeObjectWithCurrentLargestSize.name;

      while (totalPieces >= parseInt(sizeObjectWithCurrentLargestSize.Count)) {
        newItem.count += 1;
        totalPieces -= parseInt(sizeObjectWithCurrentLargestSize.Count);
      }

      newResArray.push(newItem);
    }

    copyOfSizes = copyOfSizes.filter(function (object) {
      return object.Count != currentLargestSize;
    });
  };

  while (copyOfSizes.length > 0) {
    _loop2();
  }

  return newResArray;
};

window.addEventListener('click', function () {
  var paramsDictionary = {
    "cart": app.foodCounter.cart,
    "adults": $('#numAdults').val(),
    "kids": $('#numKids').val(),
    "date": $('#datepicker').val()
  };
  urlEncodeParams(paramsDictionary);
});

$('#cart-click').on('click', function(){
  const cart = $("#my-cart");
  if ( cart.hasClass("hidden") ){
    cart.removeClass("hidden");
  }else{
    cart.addClass("hidden");
  }
})