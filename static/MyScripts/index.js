const MODAL_DIV =
  '<div id="myModal" class="modal lindo-purple"><div class="modal-content main-card">' +
  '<span class="close">X</span>' +
  "contentPlaceHolder" +
  "</div></div>";

const MAIN_MODAL_CONTENT =
  "<h2> ItemNamePlaceholder: </h2>" +
  "<p> HeaderPlaceholder </p>" +
  "<div class='selection row'> SelectionPlaceholder <div class='col-xs-12'><div id='addToCart'class='add-select'>Add to cart</div></div></div>" +
  '<div class="row modal-add-to-order">namePlaceholder\'s in your cart: </div><div id="idPlaceholder"' +
  ' class="row"></div><div class="button button1" id="done-selection">Done</div>';

const AT_FLAVOR_LIMIT_DIV = `<div class='order-limit-modal-div'>Sorry, you have reached the max number of unique flavors for this item
<div class="button button1" id="done-selection"><span class='lindo-red'>Ok</span></div></div>`;

const AT_ORDER_LIMIT_DIV = `<div class='order-limit-modal-div'>Based on your number of people, we recommend the current cart limit.<br/>
                                 But you can click on <span>"I want to add more"</span> to increase the size of your cart!
                                 <div class="button button1" id="add-more-cart"><span class='lindo-red'>I want to add more</span></div></div>`;

const PICK_NUMBER_MORE_ITEMS =
  '<div style="color: red;" class="col-xs-12 col-sm-10 col-sm-offset-1">( SelectNumberPlaceholder )</div>';

const ITEM_HTML_FOR_LIST = `<tr class='cart-title-row'><td class='count-column'><span class="span increase" id="appendValuePlaceholder"> + </span> countPlaceholder <span class="span decrease" id="appendValuePlaceholder"> - </span></td>`;

const DEFAULT_MIN = 8;

const alertUserToCartMessage =
  `<div class='order-limit-modal-div'><h3>Thanks for choosing Taco Lindo!</h3><h3>Lets plan your event!</h3>` +
  `<h4 style="text-align:left; margin-top: 5vw;">Follow the steps on this page and make the selections for your order.<br/><br/>` +
  `As you add to your order, you can find your cart at the bottom of the page.</h4>` +
  `<div class="button button1" id="done-selection"><span>Got it!</span></div></div>`;

function isInView(idSelector) {
  const element = $(idSelector);
  const topOfElement = element.offset().top;
  const bottomOfElement = element.offset().top + element.outerHeight();

  const topOfScreen = $(window).scrollTop();
  const bottomOfScreen = topOfScreen + window.innerHeight;
  // This works, Im not sure why.
  return bottomOfElement > topOfScreen && bottomOfScreen > topOfElement;
}

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
  if (done != undefined) {
    done.onclick = () => {
      span.click();
    };
  }
  window.onclick = function(event) {
    if (event.target == modal) {
      span.click();
    }
  };
};

// function init() {
const urlEncode = function(paramDictionary) {
  window.history.replaceState(
    {},
    "",
    "?" + encodeURIComponent(JSON.stringify(paramDictionary))
  );
};
let MOBILE_MODE = window.innerWidth <= 780;
window.onresize = function() {
  MOBILE_MODE = window.innerWidth <= 780;
};
const paramsToEncode = {};
if (sessionStorage.getItem("cart") != undefined) {
  paramsToEncode["cart"] = JSON.parse(sessionStorage.getItem("cart"));
  if (sessionStorage.getItem("date") != undefined) {
    paramsToEncode["date"] = sessionStorage.getItem("date");
  }
  urlEncode(paramsToEncode);
}
const urlDecode = function() {
  const urlSearchString = window.location.search;
  if (!urlSearchString.includes("?")) return {};
  try {
    const paramDictionary = JSON.parse(
      decodeURIComponent(urlSearchString.replace("?", ""))
    );
    return paramDictionary;
  } catch {
    window.history.replaceState({}, "", "");
    return {};
  }
};

const alertUserToCart = function(message) {
  if (!sessionStorage.getItem("hasBeenAlertedAlready")) {
    createModal("#modalHolder", message);
    sessionStorage.setItem("hasBeenAlertedAlready", "has been alerted");
  }
};

alertUserToCart(alertUserToCartMessage);

const setAppMaxItems = function(app) {
  let numGuests;
  let numAdults = $("#numAdults").val();
  let numKids = $("#numKids").val();

  if (numAdults === "") numAdults = 0;
  if (numKids === "") numKids = 0;
  // if the user entered not a number for the number of kids or adults. or if the total is 0, the return false.
  if (isNaN(numAdults) || isNaN(numKids) || numAdults + numKids === 0) {
    app.validGuests = false;
    // if the user currently is getting help, and the total people goes to 0, prompt to enter valid number.
    if (app.help) {
      $("#number-rec").html("Please enter a valid number for recommendation.");
    }
    return;
  }

  // else, convert the number to integer value, from the input string
  app.environ.Adults = parseInt(numAdults);
  app.environ.Kids = parseInt(numKids);

  // calculate how many guests the entered adults and kids should be considered.
  numGuests = setNumberOfGuests(app.environ.Adults, app.environ.Kids);
  app.maxItems = Math.ceil(numGuests / parseInt(DEFAULT_MIN));

  // show the string to tell user how many entrees to choose.
  setRecommendationNumberString(app, app.help);

  app.validGuests = true;
};

function setNumberOfGuests(numAdults, numKids) {
  const numKidsWeighted = Math.ceil(0.5 * numKids);
  // if 0.5 * kids + adults is less than 8, consider number of guests to be 8
  if (numKidsWeighted + numAdults < 8) {
    return 8;
  }
  return numKidsWeighted + numAdults;
}

function setRecommendationNumberString(application, help) {
  const numberRec = $("#number-rec");
  if (help) {
    application.updateRecommendation(numberRec);
  }
}

function MenuItem(itemDictionary, parent) {
  this.environ = itemDictionary;
  this.notSelectKeys = new Set(["name", "description", "_id", "type"]);
  this.toLimit = new Set(["Entree", "entree"]);
  this.isExpanded = false;
  this.sizeWord = "";
  this.parent = parent;
  this.selectedRadioButtons = {};

  this.button = function() {
    if (!MOBILE_MODE) {
      return `<div><div id="${this.getId()}"
                    class="entree-item col-xs-10 col-xs-offset-1 entree-options">
                      <h4 class='entree-header'>${this.environ.name}</h4>
                      <div class='entree-description'>${this.getDescriptionList()}</div>
                  </div>
                  <div id="${this.getId()}-help-select" class="col-xs-10 col-xs-offset-1 options-spacing"></div>
              </div>`;
    }
    return `<div><div id="${this.getId()}"class="entree-item col-xs-12 entree-options">
                    <h4 class='entree-header'>${this.environ.name}</h4>
                    <div class='entree-description'>${this.getDescriptionList()}</div>
                  </div>
                  <div id="${this.getId()}-help-select" class="col-xs-10 col-xs-offset-1 options-spacing"></div>
              </div>`;
  };

  this.getId = function() {
    return this.environ.name.replace(/\s/g, "-").replace("&", "and");
  };
  this.target = function() {
    return "#" + this.environ.type.toLowerCase();
  };
  this.getModalContent = function(help) {
    let content = MAIN_MODAL_CONTENT.replace(
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
    let content = "";
    for (const key in this.environ) {
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
    if (!typeof array) {
      return "";
    }
    key = this.trimKey(key);
    let content = `<div class='col-xs-10 choose-option'> Choose ${key} :  <select class='select-setting'>`;
    // if asking for help, and the item is of entree type, and the key is the size. only return option for the smallest size
    if (help && this.toLimit.has(this.environ.type) && key == "size") {
      const sizeKey = this.environ.hasOwnProperty("sizes") ? "sizes" : "size";
      const currentLargestSize = Math.min.apply(
        Math,
        this.environ[sizeKey].map(function(object) {
          return object.Count;
        })
      );
      const value = this.environ[sizeKey].find(function(object) {
        return object.Count == currentLargestSize;
      });
      return (
        content +
        `<option value='${key}'>${value.name.trim()}</option></select></div>`
      );
    }
    $.each(array, function(index, value) {
      if (typeof value == "object" && value.hasOwnProperty("name")) {
        value = value.name;
      }
      content += `<option value='${key}'>${value.trim()}</option>`;
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

  this.getDescriptionList = function() {
    let description = "<ul>";
    if (this.environ.hasOwnProperty("description")) {
      if (this.environ.description.length > 0) {
        $.each(this.environ.description, function(index, element) {
          description += `<li>${element}</li>`;
        });
      }
    }
    return description;
  };
  this.getHeader = function() {
    if (MOBILE_MODE) {
      return '</ul><p class="please-select-from">Please choose from options:</p>';
    } else {
      return '</ul><p class="please-select-from">Please choose from options:</p>';
    }
  };

  this.showOptionsUnderHeader = function(type) {
    const target = `#${this.getId()}-help-select`;
    if (this.closeOptions(target)) {
      return;
    }
    const optionsHtmlToInsert = this.menuItemOptions(type);
    $(target).html(optionsHtmlToInsert);
    this.isExpanded = true;
    this.addControlsToRadioButtons();
  };

  this.addControlsToRadioButtons = function() {
    const app = this;
    const targetClassName = this.getId() + "-radio";
    const radioButtonsArr = $(`.${targetClassName}`);
    $.each(radioButtonsArr, function(index, button) {
      $(button).on("click", function() {
        app.selectedRadioButtons[
          this.name.replace(app.getId(), "")
        ] = this.value;
      });
    });

    $(`#${app.getId()}-addToCart`).on("click", function() {
      const selectedItem = deepCopy(app.selectedRadioButtons);
      selectedItem.name = app.environ.name;
      selectedItem.count = 1;
      selectedItem.type = app.environ.type;
      if (app.toLimit.has(selectedItem.type)) {
        selectedItem[app.sizeWord] = app.getSmallestSize();
      }
      app.parent.tryToAddItemToCart(selectedItem);
    });
  };

  this.getSmallestSize = function() {
    let arrayOfItemSizes = this.environ[this.sizeWord];
    if (arrayOfItemSizes == undefined) {
      arrayOfItemSizes = this.environ[this.sizeWord + "s"];
    }
    let minSize = { Count: 100 };
    arrayOfItemSizes.forEach(function(object) {
      if (parseInt(object.Count) < minSize.Count) {
        minSize = object;
      }
    });
    if (minSize.name == undefined) {
      return this.getSmallestSizeBasedOnPrice(arrayOfItemSizes);
    }
    return minSize.name;
  };

  this.getSmallestSizeBasedOnPrice = function(arrayOfItemSizes) {
    const price = arrayOfItemSizes[0].Price == undefined ? "price" : "Price";
    const minSize = {};
    minSize[price] = 1000;
    arrayOfItemSizes.forEach(function(object) {
      if (parseInt(object[price]) < minSize[price]) {
        minSize[price] = parseInt(object[price]);
        minSize.name = object.name;
      }
    });
    return minSize.name;
  };

  this.closeOptions = function(target = `#${this.getId()}-help-select`) {
    if (this.isExpanded) {
      $(target).html("");
      this.isExpanded = false;
      return true;
    }
    return false;
  };
  this.menuItemOptions = function(menuItemType) {
    const app = this;
    let htmlOptions = "";
    const itemKeys = Object.keys(this.environ);
    itemKeys.forEach(function(key, index) {
      if (app.isSizeKey(key)) {
        app.sizeWord = app.trimKey(key);
      }
      if (
        !app.notSelectKeys.has(key) &&
        (!app.isSizeKey(key) || !app.toLimit.has(menuItemType))
      ) {
        htmlOptions += app.getOptionsForKey(app.environ[key], app.trimKey(key));
      }
    });
    const addToCartButton = `<div class='col-xs-12'><div id='${app.getId()}-addToCart' class='add-select'>Add to cart</div></div>`;

    return htmlOptions == ""
      ? '<div><span class="lindo-red">No options to choose from.</span></br> Simply click "Add to Cart"</div>' +
          addToCartButton
      : htmlOptions + addToCartButton;
  };

  this.getOptionsForKey = function(arrayOfOptions, key) {
    let optionHtml = `<div class='col-xs-12' style='text-align:left;'><p class='lindo-red'>Choose ${key}:</p>`;
    optionHtml += this.makeRadioButtons(arrayOfOptions, key);
    optionHtml += "</div>";
    return optionHtml;
  };

  this.makeRadioButtons = function(arrayOfOptions, key) {
    let checked = true;
    const app = this;
    let startRadioSection = "";
    arrayOfOptions.forEach(function(element, index) {
      if (typeof element == "object" && element.hasOwnProperty("name")) {
        element = element.name;
      }
      element = element.trim();
      startRadioSection += app.getRadioButtonForOption(element, key, checked);
      if (checked) {
        app.selectedRadioButtons[key] = element;
        checked = false;
      }
    });
    return startRadioSection;
  };

  this.getRadioButtonForOption = function(element, key, shouldBeChecked) {
    let radioButtonOption = `<label class='radio-button-container'>${element}
                              <input class='${this.getId()}-radio' 
                                    type='radio' 
                                    name='${this.getId() + key}'
                                    value='${element}'`;
    radioButtonOption += shouldBeChecked ? "checked='checked'>" : ">";
    radioButtonOption += "<span class='checkmark'></span></label>";
    return radioButtonOption;
  };

  this.isSizeKey = function(key) {
    const setOfPossibleSizeKeys = new Set([
      "size",
      "sizes",
      "portion",
      "portions",
      "Size",
      "Sizes",
      "Portions",
      "Portion"
    ]);
    return setOfPossibleSizeKeys.has(key);
  };
}
function CartBar(parent) {
  this.parent = parent;

  this.getBar = function() {
    const itemsBar = this.getItemsBar();
    return `<div id="cart-bar-anchor"></div><div id='cart-bar' class='cart-bar-container'>cartItemsPlaceHolder</div>`.replace(
      "cartItemsPlaceHolder",
      itemsBar
    );
  };

  this.getColorFromPercentage = function(percentage) {
    var r,
      g,
      b = 0;
    if (percentage < 50) {
      g = 255;
      r = Math.round(5.1 * percentage);
    } else {
      r = 255;
      g = Math.round(510 - 5.1 * percentage);
    }
    var h = r * 0x10000 + g * 0x100 + b * 0x1;
    return "#" + ("000000" + h.toString(16)).slice(-6);
  };

  this.getItemsBar = function() {
    const sizeOfCart = this.parent.foodCounter.getCountOfItemsToLimit();
    const percentage = (sizeOfCart / this.parent.maxItems) * 100;
    const color = this.getColorFromPercentage(
      percentage > 100 ? 100 : percentage
    );

    const stylesTarget = $("#cart-bar-style");
    stylesTarget.html(
      `.cart-bar-width{ width: ${percentage}%; background-color: ${color}; }`
    );
    return `<div id='cart-load'class='cart-load-bar cart-bar-width'></div>`;
  };
}

function PriceManager(prices) {
  this.possibleSizeKeys = [
    "size",
    "sizes",
    "portion",
    "portions",
    "Size",
    "Sizes",
    "Portions",
    "Portion"
  ];
  this.possibleCostKeys = [
    ...this.possibleSizeKeys,
    "flavor",
    "flavors",
    "meat",
    "protein"
  ];
  this.prices = prices;

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
    if (total == NaN) {
      throw new Exception("could not get price of: ", itemInCart);
    }
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

function FoodCounter(cart, app, prices) {
  this.cart = cart;
  this.cartOfOnlyMinSizes = [];
  this.toLimit = new Set(["Entree", "entree"]);
  this.priceManager = new PriceManager(prices);
  this.parentApp = app;
  this.possibleSizeKeys = ["size", "sizes", "portion", "portions"];

  this.addItemToCart = function(itemToAdd) {
    let needToAppendToCart = true;
    for (const itemInCart of this.cart) {
      // if item is the same as another item except for the count, append 1 to the count.
      if (
        needToAppendToCart &&
        objectsAreEqual(itemInCart, itemToAdd, ["count"])
      ) {
        itemInCart.count = itemInCart.count + 1;
        needToAppendToCart = false;
      }
    }
    if (needToAppendToCart) {
      this.cart.push(itemToAdd);
    }
    if (this.parentApp.help) {
      this.setMinCartAndUserCart();
    }
  };

  this.setMinCartAndUserCart = function() {
    this.cartOfOnlyMinSizes = convertCartToSmallSizes(
      this.cart,
      this.parentApp.menu,
      false
    );
    this.cart = convertCartToSmallSizes(
      this.cartOfOnlyMinSizes,
      this.parentApp.menu,
      true
    );
  };
  this.getListFromItem = function(itemObject) {
    let string = "";
    const keys = Object.keys(itemObject);
    for (var key of keys) {
      key = key.toLowerCase();
      // string += "-" + itemObject[key];
      if (key === "flavor" || key === "protein") {
        string += `<div><span class='lindo-red'>PROTEIN:</span> ${itemObject[key]}</div>`;
      } else {
        string += `<div><span class='lindo-red'>${key.toUpperCase()}:</span> ${
          itemObject[key]
        }</div>`;
      }
    }
    return string;
  };

  this.getHtmlForItem = function(itemObject, index, itemPrice) {
    const appendValueParams = index.toString();
    const idForShowRow = index.toString();
    let newDiv = ITEM_HTML_FOR_LIST.replace(
      /appendValuePlaceholder/g,
      appendValueParams
    )
      .replace("countPlaceholder", itemObject.count)
      .replace("idPlaceholder", idForShowRow + "-description");

    const copyObject = deepCopy(itemObject);
    let extraDescription = "";

    if (!MOBILE_MODE) {
      extraDescription = " - " + itemObject.size;
      delete copyObject["size"];
    }

    newDiv +=
      `<td onclick='showDescription("${idForShowRow}-description")' class='title-cart item-title'>${itemObject.name} ${extraDescription}</td>` +
      `<td onclick='showDescription("${idForShowRow}-description")'class='title-cart'><span class="index-item-prices">$ ${itemPrice}</span><span id="${idForShowRow}-description-glyph" class="glyphicon glyphicon-chevron-down spacing"></span></td></tr>`;

    delete copyObject["name"];

    delete copyObject["count"];
    newDiv += this.itemDescriptionToString(idForShowRow, copyObject);
    return newDiv;
  };
  this.itemDescriptionToString = function(idForShowRow, copyObject) {
    // if (window.innerWidth < 600) {
    return `<tr id="${idForShowRow}-description" class="hidden"><td colspan="3" class='phone-cart-description'>${this.getListFromItem(
      copyObject
    )}</td></tr>`;
    // } else {
    //   return `<tr id="${idForShowRow}-description" class='hidden'><td></td><td class="cart-item-description">${this.getListFromItem(
    //     copyObject
    //   )}</td><td></td></tr>`;
    // }
  };

  this.toString = function(itemName = null) {
    let cartToString = "<table id='cart-table'><tbody>";
    const self = this;
    try {
      this.cart.forEach(function(itemInCart, index) {
        var itemPrice = self.priceManager
          .getPriceForItem(itemInCart)
          .toFixed(2);
        if (!itemName || itemInCart.name == itemName) {
          cartToString += self.getHtmlForItem(itemInCart, index, itemPrice);
        }
      });
      return cartToString + "</tbody></table>";
    } catch (error) {
      console.log(error);
      self.cart = [];
    }
  };

  this.canAddItemToCart = function(
    selectionItemObject,
    maxFlavors,
    maxItems,
    type,
    help
  ) {
    if (!this.toLimit.has(type) || !this.parentApp.help) {
      return true;
    }
    maxFlavors = Math.min(maxFlavors, maxItems);
    if (this.alreadyAtMaxFlavorLimit(selectionItemObject, maxFlavors)) {
      return false;
    } else if (!help) {
      return true;
    }
    const toLimitCount = this.getCountOfItemsToLimit();

    if (toLimitCount >= maxItems) {
      return false;
    }
    return true;
  };

  this.getAddToCartError = function(selectionItemObject, maxFlavors, maxItems) {
    maxFlavors = Math.min(maxFlavors, maxItems);
    if (this.alreadyAtMaxFlavorLimit(selectionItemObject, maxFlavors)) {
      return AT_FLAVOR_LIMIT_DIV;
    }
    const toLimitCount = this.getCountOfItemsToLimit();
    if (toLimitCount >= maxItems && this.parentApp.help) {
      return AT_ORDER_LIMIT_DIV;
    }
    return "";
  };
  this.pickNumberOfItemsMessage = function(maxItems, help) {
    if (!help) {
      return "";
    }
    const numberOfItemsToPick = maxItems - this.getCountOfItemsToLimit();
    const sayLessOrMore =
      numberOfItemsToPick > 0
        ? "Choose more Entrees"
        : numberOfItemsToPick == 0
        ? "We recommend this number of Entrees"
        : "Exceeded the recommended amount of Entrees";
    return PICK_NUMBER_MORE_ITEMS.replace(
      "SelectNumberPlaceholder",
      sayLessOrMore
    );
  };

  this.getCountOfItemsToLimit = function() {
    let count = 0;
    for (const itemInCart of this.cartOfOnlyMinSizes) {
      if (this.toLimit.has(itemInCart.type)) {
        count += itemInCart.count;
      }
    }
    return count;
  };

  this.alreadyAtMaxFlavorLimit = function(itemObj, appMaxFlavors) {
    const countedFlavors = new Set([itemObj.flavor]);
    let flavorCount = 1;
    for (const itemInCart of this.cart) {
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
    return false;
  };
  this.countItems = function() {
    var total = 0;
    for (var i = 0; i < this.cart.length; i++) {
      total += this.cart[i].count;
    }
    return total;
  };
}

function App(cart, menu, prices) {
  this.menu = {};

  for (const menuItem of menu) {
    this.menu[menuItem.name] = new MenuItem(menuItem, this);
  }
  this.toLimit = new Set(["Entree", "entree"]);
  this.foodCounter = new FoodCounter(cart, this, prices);
  this.CartBar = new CartBar(this);
  this.prices = prices;
  this.maxItems = 20;
  this.maxFlavors = 4;
  this.currentItem = "";
  this.help = false;
  this.validGuests = false;
  this.environ = {};

  this.run = function() {
    $("#entree").empty();
    $("#side").empty();
    this.showSelectedFood();

    for (const menuItem in this.menu) {
      const menuClass = this.menu[menuItem];
      $(menuClass.target()).append(menuClass.button());

      const MyApp = this;

      $("#" + menuClass.getId()).on("click", function() {
        const itemName = menuClass.environ.name;
        MyApp.currentItem = itemName;
        const type = MyApp.menu[itemName].environ.type;
        if (MyApp.help) {
          menuClass.showOptionsUnderHeader(type);
        } else {
          MyApp.makeSelectionModal(menuClass, itemName, type);
        }
      });
    }
  };

  this.showOptions = function(menuClass, itemName, type) {};

  this.makeSelectionModal = function(menuClass, itemName, type) {
    const MyApp = this;
    // create modal
    createModal("#modalHolder", menuClass.getModalContent(MyApp.help));
    // show current items of this in cart to modal
    MyApp.showSelectedFood(itemName);

    MyApp.attachAddToCartControlls(itemName, type);

    const close = document.getElementsByClassName("close")[0];

    close.addEventListener("click", function() {
      MyApp.currentItem = "";
      MyApp.showSelectedFood();
    });
  };

  this.showSelectedFood = function(itemName = undefined) {
    const MyApp = this;
    // draw the selection to the cart
    let showSelectedFood = this.foodCounter.pickNumberOfItemsMessage(
      this.maxItems,
      this.help
    );
    if (
      this.currentItem != "" &&
      !this.toLimit.has(this.menu[this.currentItem].environ.type)
    ) {
      showSelectedFood = "";
    }
    showSelectedFood += this.foodCounter.toString(itemName);
    if (document.getElementById("modal-cart") !== undefined) {
      $("#modal-cart").html(showSelectedFood);
    }
    $("#my-cart").html(showSelectedFood);
    $("#cart-count").html(this.foodCounter.countItems());
    if (MyApp.help) {
      MyApp.updateRecommendation($("#number-rec"));
    }
    // add controllers for the increase count and decrease count
    const incButtons = document.getElementsByClassName("increase");
    for (let x = 0; x < incButtons.length; x++) {
      incButtons[x].addEventListener("click", function() {
        // MyApp.foodCounter.cart[this.id].count += 1;
        const selectionItemObject = deepCopy(MyApp.foodCounter.cart[this.id]);
        selectionItemObject.count = 1;
        MyApp.tryToAddItemToCart(selectionItemObject, itemName);
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
        if (MyApp.help) {
          MyApp.foodCounter.setMinCartAndUserCart();
        }
        MyApp.showSelectedFood(itemName);
      });
    }
  };

  this.tryToAddItemToCart = function(
    selectionItemObject,
    itemName = undefined
  ) {
    let errorMessage = "";
    const MyApp = this;
    if (
      MyApp.foodCounter.canAddItemToCart(
        selectionItemObject,
        MyApp.maxFlavors,
        MyApp.maxItems,
        selectionItemObject.type,
        MyApp.help
      )
    ) {
      // add the item to the card and re draw selection.
      MyApp.foodCounter.addItemToCart(selectionItemObject);
    } else {
      errorMessage = MyApp.foodCounter.getAddToCartError(
        selectionItemObject,
        MyApp.maxFlavors,
        MyApp.maxItems
      );
      if ($("#modal-cart").html() != undefined) {
        targetId = "#modal-cart";
      }
      createModal("#modalHolder", errorMessage);
      if (errorMessage.includes("I want to add more")) {
        MyApp.attachAddMore();
      }
    }
    // only show error if the item type is type to limit number.
    MyApp.showSelectedFood(itemName);
  };
  this.updateRecommendation = function(numberRec) {
    let recommendationString = `<div><span class='lindo-red'>Amount Help:<span id="hide-help-steps">${
      MOBILE_MODE ? "" : "Show/Hide Steps"
    } X</span></span><br/>`;
    recommendationString += `<div class="number-rec-steps"><p><span class='lindo-red'>1.</span> Choose your Entrees and select from the options.</p>`;
    recommendationString += `<p><span class='lindo-red'>2.</span> Click the "Add to cart" button</p>`;
    recommendationString += `<p><span class='lindo-red'>3.</span> Choose enough Entrees to fill this bar.</p>`;
    recommendationString += `<p><span style='font-weight: bold;'>* Choosing Sides and Add-ons will not affect the bar *</span></p>`;
    recommendationString += `<p><span class='lindo-red'>4.</span> If the bar is over-filled, remove some items from your cart.</p></div></div>`;

    recommendationString += this.CartBar.getBar();
    if (numberRec.html() == "" || numberRec.html().includes("Please")) {
      numberRec.html(recommendationString);
      $("#hide-help-steps").on("click", function() {
        $(".number-rec-steps").toggleClass("hidden");
      });
    }
  };

  this.attachAddToCartControlls = function(itemName, type) {
    const MyApp = this;
    $("#addToCart").on("click", function() {
      // create item object.
      const selectionItemObject = getSelectedOptions(itemName, type);
      // if can add it to cart
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
        MyApp.showSelectedFood(itemName);
      } else {
        const errorMessage = MyApp.foodCounter.getAddToCartError(
          selectionItemObject,
          MyApp.maxFlavors,
          MyApp.maxItems
        );
        createModal("#modalHolder", errorMessage);
        if (errorMessage.includes("I want to add more")) {
          MyApp.attachAddMore();
        }
        MyApp.showSelectedFood(itemName);
      }
    });
  };

  this.attachAddMore = function() {
    const app = this;
    $("#add-more-cart").on("click", function() {
      app.maxItems += 1;
      app.showSelectedFood();
      document.getElementsByClassName("close")[0].click();
    });
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
if (urlParams.hasOwnProperty("cart")) {
  cart = urlParams["cart"];
}
if (urlParams.hasOwnProperty("adults")) {
  $("#numAdults").val(urlParams["adults"]);
}
if (urlParams.hasOwnProperty("kids")) {
  $("#numKids").val(urlParams["kids"]);
}
let app = null;

fetch("/get_menu/get_prices/")
  .then(function(data) {
    return data.json();
  })
  .then(function(json) {
    app = new App(cart, json["Menu"], json["Prices"]);
    app.foodCounter.setMinCartAndUserCart();
    app.run();
    setAppMaxItems(app);
    setEventListeners();
  });

// ########### SET BUTTON FUNCTIONS ##################
// ###################################################
const setEventListeners = function() {
  $("#checkout-button").on("click", function() {
    const date = $("#datepicker").val();
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

  const copyCustomTextToClipboard = text => {
    let success = true;
    let range = document.createRange();
    let selection;
    if (window.clipboardData) {
      window.clipboardData.setData("Text", text);
    } else {
      const tempElement = $("<div>");
      tempElement.css({
        position: "absolute",
        left: "-1000px",
        top: "-1000px"
      });
      tempElement.text(text);
      $("body").append(tempElement);
      range.selectNodeContents(tempElement.get(0));
      selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        success = document.execCommand("copy", false, null);
      } catch (e) {
        window.prompt("Copy to clipboard: Ctrl C, Enter ", text);
      }
      if (success) {
        alert("Link copied to clipboard.");
        tempElement.remove();
      }
    }
  };

  $("#share-cart-button").on("click", function() {
    copyCustomTextToClipboard(window.location.href);
  });

  $("#numAdults").on("input", function() {
    const paramsDictionary = {
      cart: app.foodCounter.cart,
      adults: $("#numAdults").val(),
      kids: $("#numKids").val(),
      date: $("#datepicker").val()
    };
    urlEncodeParams(paramsDictionary);
    setAppMaxItems(app);
    app.showSelectedFood();
  });

  $("#numKids").on("input", function() {
    const paramsDictionary = {
      cart: app.foodCounter.cart,
      adults: $("#numAdults").val(),
      kids: $("#numKids").val(),
      date: $("#datepicker").val()
    };
    urlEncodeParams(paramsDictionary);
    setAppMaxItems(app);
    app.showSelectedFood();
  });

  // attach control to amount help to change the name of amount help on click
  $("#amount-help").on("click", function() {
    if (app.help == false && app.validGuests == false) {
      alert("Please enter a valid number of guests.");
    } else {
      const numberRec = $("#number-rec");

      app.help = !app.help;

      if (app.help && $("#my-cart").hasClass("hidden")) {
        $("#cart-click").click();
      }
      if (!app.help) {
        const menuKeys = Object.keys(app.menu);
        menuKeys.forEach(function(item) {
          app.menu[item].closeOptions();
        });
        numberRec.empty();
        $("#amount-help").html("Amount Help");
      }
      if (app.help) {
        app.foodCounter.setMinCartAndUserCart();
        app.updateRecommendation(numberRec);
        $("#amount-help").html("Remove Amount Help");
      }
      app.showSelectedFood();
      // set the url encoding search string //
      const paramsDictionary = {
        help: app.help,
        cart: app.foodCounter.cart,
        adults: $("#numAdults").val(),
        kids: $("#numKids").val(),
        date: $("#datepicker").val()
      };
      urlEncodeParams(paramsDictionary);
      /////////////////////////////////////////////
    }
  });
  window.addEventListener("click", function() {
    const paramsDictionary = {
      cart: app.foodCounter.cart,
      adults: $("#numAdults").val(),
      kids: $("#numKids").val(),
      date: $("#datepicker").val()
    };
    urlEncodeParams(paramsDictionary);
  });

  $("#cart-click").on("click", function() {
    const cart = $("#my-cart");
    if (cart.hasClass("hidden")) {
      cart.removeClass("hidden");
    } else {
      cart.addClass("hidden");
    }
  });

  $("#cart-click").on("click", function() {
    if ($("#down-glyph").hasClass("rotated")) {
      $("#down-glyph").removeClass("rotated");
    } else {
      $("#down-glyph").addClass("rotated");
    }
  });
};
// ########### END BUTTON FUNCTIONS ##################
// ###################################################
const reverseResolutionOfItems = function(orginalCart, help) {
  const newCart = [];
  orginalCart.forEach(function(element) {
    if (hasCountProperty(element)) {
      const arrayOfResolution = help
        ? convertToSmallerSizes(element)
        : convertToLargerSizes(element);
      arrayOfResolution.forEach(function(newResItem) {
        newCart.push(newResItem);
      });
    } else {
      newCart.push(element);
    }
  });
  return reconcileCart(newCart);
};

const convertCartToSmallSizes = function(orginalCart, menu, reverse = false) {
  const newCart = [];
  orginalCart.forEach(function(element) {
    if (hasCountProperty(element)) {
      const arrayOfResolution = !reverse
        ? convertToSmallerSizes(menu, element)
        : convertToLargerSizes(menu, element);
      arrayOfResolution.forEach(function(newResItem) {
        newCart.push(newResItem);
      });
    } else {
      newCart.push(element);
    }
  });
  return reconcileCart(newCart);
};

// reconcileCart takes a cart and iteratively combines like items.
// if there are 2 separate instances of a full pan taco tray with all same options.
// it will combine them to 2 full pan taco trays as one item in the cart
const reconcileCart = function(oldCart) {
  for (let curIndex = 0; curIndex < oldCart.length; curIndex++) {
    for (
      let checkIndex = curIndex + 1;
      checkIndex < oldCart.length;
      checkIndex++
    ) {
      if (objectsAreEqual(oldCart[curIndex], oldCart[checkIndex], ["count"])) {
        oldCart[curIndex].count += oldCart[checkIndex].count;
        oldCart.splice(checkIndex, 1);
        checkIndex -= 1;
      }
    }
  }
  return oldCart;
};
// tell if the menu item passed in has count in its sizes
// doing this because this will change how the cost and other parts of code are handled.
const hasCountProperty = function(menuItem) {
  for (const sizeKey of app.foodCounter.possibleSizeKeys) {
    if (app.menu[menuItem.name].environ.hasOwnProperty(sizeKey)) {
      if (
        app.menu[menuItem.name].environ[sizeKey][0].hasOwnProperty("Count") ||
        app.menu[menuItem.name].environ[sizeKey][0].hasOwnProperty("count")
      ) {
        return true;
      }
    }
  }
  return false;
};
// converToSmallerSizes converts an item (cart item) and converts it to a number
// of smaller sizes of the same item. ex: 1 full pan taco tray becomes 3 shallow pan taco trays.
const convertToSmallerSizes = function(menu, itemObject) {
  const newResArray = [];
  const sizeKey = itemObject.hasOwnProperty("size") ? "size" : "portion";
  const itemSize = itemObject[sizeKey];
  const arrayOfItemSizes = menu[itemObject.name].environ.sizes;
  let minSize = { Count: 100 };

  // find the smallest size for this menu item.
  arrayOfItemSizes.forEach(function(object) {
    if (parseInt(object.Count) < minSize.Count) {
      minSize = object;
    }
  });
  const thisItemCount = arrayOfItemSizes.find(function(element) {
    return element.name == itemSize;
  });
  const copyOfItem = deepCopy(itemObject);
  copyOfItem[sizeKey] = minSize.name;
  copyOfItem["count"] =
    (parseInt(thisItemCount.Count) / parseInt(minSize.Count)) *
    itemObject.count;
  newResArray.push(copyOfItem);
  return newResArray;
};

// convertToLargerSizes does the opposite of convertToSmallerSizes where
// if there are 3 shallow pan taco trays, the return will be 1 full pan taco tray.
const convertToLargerSizes = function(menu, itemObject) {
  const newResArray = [];
  const sizeKey = itemObject.hasOwnProperty("size") ? "size" : "portion";
  const itemSize = itemObject[sizeKey];

  // get a copy of the sizes for this item.
  let copyOfSizes = deepCopy(menu[itemObject.name].environ.sizes);
  const thisItemCount = copyOfSizes.find(function(element) {
    return element.name == itemSize;
  });
  let totalPieces = parseInt(thisItemCount.Count) * itemObject.count;

  // while loop where we will be taking the next largest size out of the list of sizes.
  while (copyOfSizes.length > 0) {
    const currentLargestSize = Math.max.apply(
      Math,
      copyOfSizes.map(function(object) {
        return object.Count;
      })
    );
    const sizeObjectWithCurrentLargestSize = copyOfSizes.find(function(object) {
      return object.Count == currentLargestSize;
    });
    if (totalPieces >= sizeObjectWithCurrentLargestSize.Count) {
      const newItem = deepCopy(itemObject);
      newItem.count = 0;
      newItem.size = sizeObjectWithCurrentLargestSize.name;
      while (totalPieces >= parseInt(sizeObjectWithCurrentLargestSize.Count)) {
        newItem.count += 1;
        totalPieces -= parseInt(sizeObjectWithCurrentLargestSize.Count);
      }
      newResArray.push(newItem);
    }
    copyOfSizes = copyOfSizes.filter(function(object) {
      return object.Count != currentLargestSize;
    });
  }
  return newResArray;
};

const showDescription = function(idForShowRow) {
  if ($("#" + idForShowRow + "-glyph").hasClass("rotated")) {
    $("#" + idForShowRow + "-glyph").removeClass("rotated");
  } else {
    $("#" + idForShowRow + "-glyph").addClass("rotated");
  }
  if ($("#" + idForShowRow).hasClass("hidden")) {
    $("#" + idForShowRow).removeClass("hidden");
  } else {
    $("#" + idForShowRow).addClass("hidden");
  }
};
const attachCartBarToScreen = () => {
  const w = $(window).scrollTop();
  const cartBarAnchor = $("#cart-bar-anchor");
  const cartBar = $("#cart-bar");
  // if the cart bar is not present, exit.
  if (cartBar.html() == undefined) {
    return;
  }
  if (w > cartBarAnchor.offset().top) {
    if (!cartBar.hasClass("fixed-top-bar")) {
      cartBar.addClass("fixed-top-bar");
      $("#cart-load").css({ height: "38px" });
      cartBarAnchor.css({ height: "65px" });
    }
  } else {
    cartBar.removeClass("fixed-top-bar");
    $("#cart-load").css({ height: "65px" });
    cartBarAnchor.css({ height: "0px" });
  }
};
const attachAmountHelpButtonToScreen = () => {
  // const cssToFixedTop = {
  //   position: "fixed",
  //   left: "0px",
  //   "margin-top": "0px",
  //   top: "0px",
  //   "z-index": 60
  // };
  // const cssRevertedBack = {
  //   position: "relative",
  //   top: "",
  //   "margin-top": "36px",
  //   "z-index": 1
  // };
  const b = $(window).scrollTop();
  const c = $("#amount-help-anchor");
  const amountHelperBar = $("#amount-help");
  if (
    !amountHelperBar.html().includes("Remove") &&
    amountHelperBar.css("margin-top") !== "0px"
  ) {
    return;
  }
  if (b > c.offset().top) {
    if (!amountHelperBar.hasClass("fixed-top-amount")) {
      amountHelperBar.addClass("fixed-top-amount");
    }
  } else {
    amountHelperBar.removeClass("fixed-top-amount");
  }
};
$(window).scroll(function() {
  attachAmountHelpButtonToScreen();
});
$(window).scroll(function() {
  attachCartBarToScreen();
});
