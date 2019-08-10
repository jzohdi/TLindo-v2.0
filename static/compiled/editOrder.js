function _toConsumableArray(arr) {
  return (
    _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread()
  );
}

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance");
}

function _iterableToArray(iter) {
  if (
    Symbol.iterator in Object(iter) ||
    Object.prototype.toString.call(iter) === "[object Arguments]"
  )
    return Array.from(iter);
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }
    return arr2;
  }
}

function _typeof(obj) {
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function _typeof(obj) {
      return typeof obj;
    };
  } else {
    _typeof = function _typeof(obj) {
      return obj &&
        typeof Symbol === "function" &&
        obj.constructor === Symbol &&
        obj !== Symbol.prototype
        ? "symbol"
        : typeof obj;
    };
  }
  return _typeof(obj);
}

var LOADING_HTML =
  '<div class="lds-ellipsis placeholder"><div></div><div></div><div></div><div></div></div>';
var ITEM_HTML_FOR_LIST =
  '<div class="col-xs-12 col-sm-10 col-sm-offset-1"><span class="span increase"  id="appendValuePlaceholder"> ' +
  '+ </span> countPlaceholder <span class="span decrease" id="appendValuePlaceholder"> - </span>';
var DEFAULT_MIN = 8;
var MAIN_MODAL_CONTENT =
  "<h2> ItemNamePlaceholder: </h2>" +
  "<p> HeaderPlaceholder </p>" +
  "<div class='selection row'> SelectionPlaceholder <div id='addToCart'" +
  "class='col-xs-2 col-xs-offset-8 add-select'>Add to cart</div></div>" +
  '<div class="row modal-add-to-order">namePlaceholder\'s in your cart: </div><div id="idPlaceholder"' +
  ' class="row"></div><div class="button button1" id="done-selection">Done</div>';
var orginalPageHtml = $("#select-menu").html();
$("#select-menu").html(LOADING_HTML.replace("placeholder", "largeClass"));

function MenuItem(itemDictionary) {
  this.environ = itemDictionary;
  this.notSelectKeys = new Set(["name", "description", "_id", "type"]);
  this.toLimit = new Set(["Entree", "entree"]);

  this.button = function() {
    return '<div id="'
      .concat(
        this.getId(),
        '"\n                class="entree-item col-xs-12 col-sm-6 col-md-12 entree-options">\n                  '
      )
      .concat(this.environ.name, "\n              </div>");
  };

  this.getId = function() {
    return this.environ.name.replace(/\s/g, "-").replace("&", "and");
  };

  this.target = function() {
    return "#" + this.environ.type.toLowerCase();
  };

  this.getModalContent = function(help) {
    var content = MAIN_MODAL_CONTENT.replace(
      "ItemNamePlaceholder",
      this.environ.name
    )
      .replace("HeaderPlaceholder", this.getHeader())
      .replace("SelectionPlaceholder", this.getSelection(help))
      .replace("namePlaceholder", this.environ.name)
      .replace("idPlaceholder", "modal-cart");
    return content;
  };

  this.getSelection = function(help) {
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

  this.getSelectDiv = function(key, array, help) {
    if (!_typeof(array)) {
      return "";
    }

    key = this.trimKey(key);
    var content = "<div class='col-sm-6 col-md-4'> Choose ".concat(
      key,
      " :  <select class='select-setting'>"
    ); // if asking for help, and the item is of entree type, and the key is the size. only return option for the smallest size

    if (help && this.toLimit.has(this.environ.type) && key == "size") {
      var sizeKey = this.environ.hasOwnProperty("sizes") ? "sizes" : "size";
      var currentLargestSize = Math.min.apply(
        Math,
        this.environ[sizeKey].map(function(object) {
          return object.Count;
        })
      );
      var value = this.environ[sizeKey].find(function(object) {
        return object.Count == currentLargestSize;
      });
      return (
        content +
        "<option value='"
          .concat(key, "'>")
          .concat(value.name.trim(), "</option></select></div>")
      );
    }

    $.each(array, function(index, value) {
      if (_typeof(value) == "object" && value.hasOwnProperty("name")) {
        value = value.name;
      }

      content += "<option value='"
        .concat(key, "'>")
        .concat(value.trim(), "</option>");
    });
    content += "</select></div>";
    return content;
  };

  this.trimKey = function(key) {
    if (key.slice(-1) == "s") {
      key = key.slice(0, -1);
    }

    return key;
  };

  this.getHeader = function() {
    var description = "<ul>";

    if (this.environ.hasOwnProperty("description")) {
      if (this.environ.description.length > 0) {
        $.each(this.environ.description, function(index, element) {
          description += "<li>".concat(element, "</li>");
        });
      }
    }

    return (
      description +
      '</ul><p class="please-select-from">Please choose from options:</p>'
    );
  };
}

function FoodCounter(cart, app, pricesDict) {
  this.cart = cart.map(function(itemObject) {
    delete itemObject.cost;
    return itemObject;
  });
  this.toLimit = new Set(["Entree", "entree"]);
  this.parentApp = app;
  this.possibleSizeKeys = ["size", "sizes", "portion", "portions"];
  this.possibleCostKeys = [].concat(_toConsumableArray(this.possibleSizeKeys), [
    "flavor",
    "flavors",
    "meat",
    "protein"
  ]);
  this.prices = pricesDict;

  this.addItemToCart = function(itemToAdd) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (
        var _iterator = this.cart[Symbol.iterator](), _step;
        !(_iteratorNormalCompletion = (_step = _iterator.next()).done);
        _iteratorNormalCompletion = true
      ) {
        var itemInCart = _step.value;

        // if item is the same as another item except for the count, append 1 to the count.
        if (objectsAreEqual(itemInCart, itemToAdd, ["count"])) {
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

  this.getHtmlForItem = function(itemObject, index) {
    var appendValueParams = index.toString();
    var newDiv = ITEM_HTML_FOR_LIST.replace(
      /appendValuePlaceholder/g,
      appendValueParams
    ).replace("countPlaceholder", itemObject.count);

    for (var key in itemObject) {
      if (key != "count") {
        newDiv += '<span class="my-cart-key"> '.concat(
          itemObject[key],
          '</span><strong class="order-keys"> | </strong>'
        );
      }
    }

    return newDiv;
  };

  this.toString = function() {
    var itemName =
      arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var total = 0.0;
    var cartToString = "";
    var self = this;
    this.cart.forEach(function(itemInCart, index) {
      if (!itemName || itemInCart.name == itemName) {
        cartToString += self.getHtmlForItem(itemInCart, index);
        var itemPrice = self.getPriceForItem(itemInCart).toFixed(2);
        cartToString += '<small class="my-cart-key">$'.concat(
          itemPrice,
          "</small></div>"
        );
        total += parseFloat(itemPrice);
      }
    });
    $("#cart-total").html(total.toFixed(2));
    return cartToString;
  };

  this.canAddItemToCart = function(
    selectionItemObject,
    maxFlavors,
    maxItems,
    type,
    help
  ) {
    maxFlavors = Math.min(maxFlavors, maxItems);

    if (this.alreadyAtMaxFlavorLimit(selectionItemObject, maxFlavors)) {
      return false;
    }

    return true;
  };

  this.getAddToCartError = function(selectionItemObject, maxFlavors, maxItems) {
    maxFlavors = Math.min(maxFlavors, maxItems);

    if (this.alreadyAtMaxFlavorLimit(selectionItemObject, maxFlavors)) {
      return AT_FLAVOR_LIMIT_DIV;
    }

    return "";
  };

  this.alreadyAtMaxFlavorLimit = function(itemObj, appMaxFlavors) {
    var countedFlavors = new Set([itemObj.flavor]);
    var flavorCount = 1;
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (
        var _iterator2 = this.cart[Symbol.iterator](), _step2;
        !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done);
        _iteratorNormalCompletion2 = true
      ) {
        var itemInCart = _step2.value;

        if (
          !itemInCart.hasOwnProperty("flavor") ||
          countedFlavors.has(itemInCart.flavor)
        ) {
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

    return false;
  };

  this.getPriceForItem = function(itemToGetPricesFrom) {
    var total = 1.0;
    var itemName = itemToGetPricesFrom.name;
    var keysToCalculateCost = this.getCostKeys(itemToGetPricesFrom);
    var thisItemPriceDict = this.prices[itemName];
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (
        var _iterator3 = keysToCalculateCost[Symbol.iterator](), _step3;
        !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done);
        _iteratorNormalCompletion3 = true
      ) {
        var key = _step3.value;
        var priceDictKeyValue = parseFloat(thisItemPriceDict[key]);
        total *= priceDictKeyValue.toFixed(2);
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

    total *= itemToGetPricesFrom["count"].toFixed(2);
    return total;
  };

  this.getCostKeys = function(itemObject) {
    var keysFoundInItemObject = [];
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (
        var _iterator4 = this.possibleCostKeys[Symbol.iterator](), _step4;
        !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done);
        _iteratorNormalCompletion4 = true
      ) {
        var possibleCostKey = _step4.value;

        if (itemObject.hasOwnProperty(possibleCostKey)) {
          keysFoundInItemObject.push(itemObject[possibleCostKey]);
        }
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

    return keysFoundInItemObject;
  };
}

function App(cart, menu, pricesDict) {
  this.menu = {};
  var _iteratorNormalCompletion5 = true;
  var _didIteratorError5 = false;
  var _iteratorError5 = undefined;

  try {
    for (
      var _iterator5 = menu[Symbol.iterator](), _step5;
      !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done);
      _iteratorNormalCompletion5 = true
    ) {
      var menuItem = _step5.value;
      this.menu[menuItem.name] = new MenuItem(menuItem);
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

  this.toLimit = new Set(["Entree", "entree"]);
  this.foodCounter = new FoodCounter(cart["order"], this, pricesDict);
  this.maxItems = 20;
  this.maxFlavors = 4;
  this.currentItem = "";
  this.help = false;
  this.validGuests = false;
  this.environ = {};

  this.run = function() {
    var _this = this;

    if (this.foodCounter.cart.length > 0) {
      this.showSelectedFood("#my-cart");
    }

    var _loop = function _loop(menuItem) {
      var menuClass = _this.menu[menuItem];
      $(menuClass.target()).append(menuClass.button());
      var MyApp = _this;
      $("#" + menuClass.getId()).on("click", function() {
        var itemName = menuClass.environ.name;
        MyApp.currentItem = itemName;
        var type = MyApp.menu[itemName].environ.type; // create modal

        createModal("#modalHolder", menuClass.getModalContent(MyApp.help)); // show current items of this in cart to modal

        MyApp.showSelectedFood("#modal-cart", itemName);
        MyApp.attachAddToCartControlls(itemName, type);
        var close = document.getElementsByClassName("close")[0];
        close.addEventListener("click", function() {
          MyApp.currentItem = "";
          MyApp.showSelectedFood("#my-cart");
        });
      });
    };

    for (var menuItem in this.menu) {
      _loop(menuItem);
    }
  };

  this.showSelectedFood = function(idOfTarget) {
    var itemName =
      arguments.length > 1 && arguments[1] !== undefined
        ? arguments[1]
        : undefined;
    var errorMessage =
      arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
    var MyApp = this;
    var cartToString = this.foodCounter.toString(itemName);
    $(idOfTarget).html(cartToString); // add controllers for the increase count and decrease count

    var incButtons = document.getElementsByClassName("increase");

    for (var x = 0; x < incButtons.length; x++) {
      incButtons[x].addEventListener("click", function() {
        MyApp.foodCounter.cart[this.id].count += 1;
        MyApp.showSelectedFood(idOfTarget, itemName);
      });
    }

    var decButtons = document.getElementsByClassName("decrease");

    for (var _x = 0; _x < decButtons.length; _x++) {
      decButtons[_x].addEventListener("click", function() {
        MyApp.foodCounter.cart[this.id].count -= 1; // if the count for this item goes to 0, remove it from the cart.

        if (MyApp.foodCounter.cart[this.id].count == 0) {
          MyApp.foodCounter.cart.splice(this.id, 1);
        }

        MyApp.showSelectedFood(idOfTarget, itemName);
      });
    }
  };

  this.attachAddToCartControlls = function(itemName, type) {
    var MyApp = this;
    $("#addToCart").on("click", function() {
      // create item object.
      var selectionItemObject = getSelectedOptions(itemName, type); // if can add it to cart

      if (
        MyApp.foodCounter.canAddItemToCart(
          selectionItemObject,
          MyApp.maxFlavors,
          MyApp.maxItems,
          type,
          MyApp.help
        )
      ) {
        // add the item to the card and re draw selection.
        MyApp.foodCounter.addItemToCart(selectionItemObject);
        MyApp.showSelectedFood("#modal-cart", itemName);
      } else {
        var errorMessage = MyApp.foodCounter.getAddToCartError(
          selectionItemObject,
          MyApp.maxFlavors,
          MyApp.maxItems
        );
        MyApp.showSelectedFood("#modal-cart", itemName, errorMessage);

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

var main = function main() {
  $("#checkoutButton").on("click", function() {
    var form = document.createElement("form");
    var hiddenInput = document.createElement("input");
    hiddenInput.setAttribute("type", "hidden");
    hiddenInput.setAttribute("name", "order");
    hiddenInput.setAttribute("value", JSON.stringify(app.foodCounter.cart));
    form.appendChild(hiddenInput);
    $("#custom-styles2").html(
      ".lds-ellipsis { margin-left: 0px; width: 100px !important; height: 25px !important; margin-top: -8px !important; transform: scale(0.15);}"
    );
    var originalConfirmButton = $("#checkoutButton").html();
    $("#checkoutButton").html(LOADING_HTML);
    $("#checkoutButton").attr("style", "pointer-events:none;");
    $.post("/commit_order_edit/", $(form).serialize()).done(function(data) {
      if (data.hasOwnProperty("error")) {
        alert("Something went wrong.");
        $("#checkoutButton").html(originalConfirmButton);
        $("#checkoutButton").removeAttr("style");
      } else {
        sessionStorage.removeItem("cachedData");
        location.href = "/user_orders";
      }
    });
  });
};

var app = null;

var getPricesAsync = function getPricesAsync() {
  var cachedData = sessionStorage.getItem("cachedData");

  if (cachedData == undefined) {
    fetch("/get_order/prices/menu/")
      .then(function(response) {
        return response.json();
      })
      .then(function(myJson) {
        $("#select-menu").html(orginalPageHtml); // $("#custom-styles").empty();
        // $("#custom-styles").html("..lds-ellipsis { transform: scale(-1)}");

        if (myJson.hasOwnProperty("error")) {
          location.href = "/user_orders";
        } else {
          var cached = JSON.stringify(myJson);
          sessionStorage.setItem("cachedData", cached);
          app = new App(myJson["order"], myJson["menu"], myJson["prices"]);
          app.run();
          main();
        }
      })
      .catch(function(error) {
        console.log(error);
      });
  } else {
    $("#select-menu").html(orginalPageHtml); // $("#custom-styles").empty();
    // $("#custom-styles").html("..lds-ellipsis { transform: scale(-1)}");

    cachedData = JSON.parse(cachedData);
    app = new App(
      cachedData["order"],
      cachedData["menu"],
      cachedData["prices"]
    );
    app.run();
    main();
  }
};

getPricesAsync();
