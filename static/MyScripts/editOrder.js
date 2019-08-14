const LOADING_HTML = `<div class="lds-ellipsis placeholder"><div></div><div></div><div></div><div></div></div>`;
// const ITEM_HTML_FOR_LIST =
//   '<div class="col-xs-12 col-sm-10 col-sm-offset-1"><span class="span increase"  id="appendValuePlaceholder"> ' +
// '+ </span> countPlaceholder <span class="span decrease" id="appendValuePlaceholder"> - </span>';
const ITEM_HTML_FOR_LIST = `<tr><td class='count-column'><span class="span increase" id="appendValuePlaceholder"> + </span> countPlaceholder <span class="span decrease" id="appendValuePlaceholder"> - </span></td>`;
const DEFAULT_MIN = 8;

const MAIN_MODAL_CONTENT =
  "<h2> ItemNamePlaceholder: </h2>" +
  "<p> HeaderPlaceholder </p>" +
  "<div style='padding-left: 12%;'class='selection row'> SelectionPlaceholder <div id='addToCart'" +
  "class='col-xs-2 col-xs-offset-8 add-select'>Add to cart</div></div>" +
  '<div class="row modal-add-to-order">namePlaceholder\'s in your cart: </div><div id="idPlaceholder"' +
  ' class="row"></div><div class="button button1" id="done-selection">Done</div>';

const orginalPageHtml = $("#select-menu").html();
$("#select-menu").html(LOADING_HTML.replace("placeholder", "largeClass"));

function MenuItem(itemDictionary) {
  this.environ = itemDictionary;
  this.notSelectKeys = new Set(["name", "description", "_id", "type"]);
  this.toLimit = new Set(["Entree", "entree"]);

  this.button = function() {
    return `<div id="${this.getId()}"
              class="entree-item col-xs-12 col-sm-6 col-md-12 entree-options">
                ${this.environ.name}
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
    let content = `<div class='col-sm-12'> Choose ${key} :  <select class='select-setting'>`;
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

  this.getHeader = function() {
    let description = "<ul>";
    if (this.environ.hasOwnProperty("description")) {
      if (this.environ.description.length > 0) {
        $.each(this.environ.description, function(index, element) {
          description += `<li>${element}</li>`;
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
  this.possibleCostKeys = [
    ...this.possibleSizeKeys,
    "flavor",
    "flavors",
    "meat",
    "protein"
  ];
  this.prices = pricesDict;

  this.addItemToCart = function(itemToAdd) {
    for (const itemInCart of this.cart) {
      // if item is the same as another item except for the count, append 1 to the count.
      if (objectsAreEqual(itemInCart, itemToAdd, ["count"])) {
        itemInCart.count = itemInCart.count + 1;
        return;
      }
    }
    this.cart.push(itemToAdd);
  };

  this.getListFromItem = function(itemObject) {
    let string = "";
    const keys = Object.keys(itemObject);
    for (const key of keys) {
      string += "-" + itemObject[key];
    }
    return string;
  };

  this.getHtmlForItem = function(itemObject, index, itemPrice) {
    const appendValueParams = index.toString();
    let newDiv = ITEM_HTML_FOR_LIST.replace(
      /appendValuePlaceholder/g,
      appendValueParams
    ).replace("countPlaceholder", itemObject.count);
    newDiv += `<td>${itemObject.name} ${itemObject.size}</td>`;
    newDiv += "<td class='price-column'>$ " + itemPrice + "</td></tr>";
    const copyObject = deepCopy(itemObject);
    delete copyObject["name"];
    delete copyObject["size"];
    delete copyObject["count"];
    newDiv += `<tr><td></td><td style="font-size: 13px;">${this.getListFromItem(
      copyObject
    )}</td><td></td></tr>`;
    return newDiv;
  };

  this.toString = function(itemName = null) {
    let total = 0.0;
    let cartToString = "<table id='cart-table'><tbody>";
    const self = this;
    this.cart.forEach(function(itemInCart, index) {
      const itemPrice = self.getPriceForItem(itemInCart).toFixed(2);
      if (!itemName || itemInCart.name == itemName) {
        cartToString += self.getHtmlForItem(itemInCart, index, itemPrice);
      }
      total += parseFloat(itemPrice);
    });
    const tax = total * 0.06625;
    $("#cart-tax").html((total * 0.06625).toFixed(2));
    $("#cart-total").html((total + tax).toFixed(2));
    return cartToString + "</tbody></table>";
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

function App(cart, menu, pricesDict) {
  this.menu = {};
  for (const menuItem of menu) {
    this.menu[menuItem.name] = new MenuItem(menuItem);
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
    this.showSelectedFood("#my-cart");

    for (const menuItem in this.menu) {
      const menuClass = this.menu[menuItem];
      $(menuClass.target()).append(menuClass.button());

      const MyApp = this;

      $("#" + menuClass.getId()).on("click", function() {
        const itemName = menuClass.environ.name;
        MyApp.currentItem = itemName;
        const type = MyApp.menu[itemName].environ.type;
        // create modal
        createModal("#modalHolder", menuClass.getModalContent(MyApp.help));
        // show current items of this in cart to modal
        MyApp.showSelectedFood("#modal-cart", itemName);

        MyApp.attachAddToCartControlls(itemName, type);

        const close = document.getElementsByClassName("close")[0];

        close.addEventListener("click", function() {
          MyApp.currentItem = "";
          MyApp.showSelectedFood("#my-cart");
        });
      });
    }
  };

  this.showSelectedFood = function(
    idOfTarget,
    itemName = undefined,
    errorMessage = ""
  ) {
    const MyApp = this;

    let cartToString = this.foodCounter.toString(itemName);
    $(idOfTarget).html(cartToString);

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
        MyApp.showSelectedFood("#modal-cart", itemName);
      } else {
        const errorMessage = MyApp.foodCounter.getAddToCartError(
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
const main = () => {
  $("#checkoutButton").on("click", function() {
    const form = document.createElement("form");
    const hiddenInput = document.createElement("input");
    hiddenInput.setAttribute("type", "hidden");
    hiddenInput.setAttribute("name", "order");
    hiddenInput.setAttribute("value", JSON.stringify(app.foodCounter.cart));
    form.appendChild(hiddenInput);
    $("#custom-styles2").html(
      ".lds-ellipsis { margin-left: 0px; width: 100px !important; height: 25px !important; margin-top: -8px !important; transform: scale(0.15);}"
    );
    const originalConfirmButton = $("#checkoutButton").html();
    $("#checkoutButton").html(LOADING_HTML);
    $("#checkoutButton").attr("style", "pointer-events:none;");

    $.post("/commit_order_edit/", $(form).serialize()).done(data => {
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
let app = null;

const getPricesAsync = function() {
  let cachedData = sessionStorage.getItem("cachedData");
  if (cachedData == undefined) {
    fetch("/get_order/prices/menu/")
      .then(function(response) {
        return response.json();
      })
      .then(function(myJson) {
        $("#select-menu").html(orginalPageHtml);
        // $("#custom-styles").empty();
        // $("#custom-styles").html("..lds-ellipsis { transform: scale(-1)}");
        if (myJson.hasOwnProperty("error")) {
          location.href = "/user_orders";
        } else {
          const cached = JSON.stringify(myJson);
          sessionStorage.setItem("cachedData", cached);
          app = new App(myJson["order"], myJson["menu"], myJson["prices"]);
          app.run();
          main();
        }
      })
      .catch(error => {
        console.log(error);
      });
  } else {
    $("#select-menu").html(orginalPageHtml);
    // $("#custom-styles").empty();
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
