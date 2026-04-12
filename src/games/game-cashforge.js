import { t } from "../core/i18n.js";

const RECHARGE_AMOUNT = 1000000;
const MAX_ENHANCE_LEVEL = 13;
const INITIAL_DOUBLE_HAMMERS = 3;

const EQUIPMENT_KEYS = ["weapon", "top", "bottom", "gloves", "shoes"];

const SHOP_PACKS = {
  restore: {
    cost: 232,
    amount: 5,
    itemKey: "restoreScrolls",
    nameKey: "cashForge.shop.pack.restore"
  },
  stone: {
    cost: 960,
    amount: 100,
    itemKey: "guardianStones",
    nameKey: "cashForge.shop.pack.stone"
  },
  crystal: {
    cost: 500,
    amount: 20,
    itemKey: "guardianCrystals",
    nameKey: "cashForge.shop.pack.crystal"
  }
};

const ENHANCE_PROBABILITIES = {
  0: { success: 100, destroy: 0, noChange: 0, down: 0, reset: 0 },
  1: { success: 100, destroy: 0, noChange: 0, down: 0, reset: 0 },
  2: { success: 90, destroy: 0, noChange: 10, down: 0, reset: 0 },
  3: { success: 80, destroy: 0, noChange: 20, down: 0, reset: 0 },
  4: { success: 70, destroy: 0, noChange: 30, down: 0, reset: 0 },
  5: { success: 60, destroy: 0, noChange: 40, down: 0, reset: 0 },
  6: { success: 20, destroy: 0, noChange: 80, down: 0, reset: 0 },
  7: { success: 5, destroy: 0, noChange: 15, down: 30, reset: 50 },
  8: { success: 2, destroy: 20, noChange: 10, down: 28, reset: 40 },
  9: { success: 1, destroy: 25, noChange: 7, down: 27, reset: 40 },
  10: { success: 0.7, destroy: 35.3, noChange: 7, down: 27, reset: 30 },
  11: { success: 1, destroy: 25, noChange: 7, down: 27, reset: 40 },
  12: { success: 1, destroy: 29, noChange: 3, down: 27, reset: 40 }
};

function createDefaultEquipmentState() {
  return Object.fromEntries(
    EQUIPMENT_KEYS.map(function (key) {
      return [
        key,
        {
          level: 0,
          destroyed: false,
          destroyedLevel: 0
        }
      ];
    })
  );
}

function createDefaultItems() {
  return {
    restoreScrolls: 0,
    guardianStones: 0,
    guardianCrystals: 0,
    doubleHammers: INITIAL_DOUBLE_HAMMERS
  };
}

function formatNumber(value) {
  return value.toLocaleString();
}

function applyDoubleHammer(odds) {
  const doubledSuccess = Math.min(100, odds.success * 2);
  const othersTotal = odds.destroy + odds.noChange + odds.down + odds.reset;

  if (othersTotal <= 0) {
    return {
      success: doubledSuccess,
      destroy: 0,
      noChange: 0,
      down: 0,
      reset: 0
    };
  }

  const remaining = Math.max(0, 100 - doubledSuccess);
  const scale = remaining / othersTotal;

  return {
    success: doubledSuccess,
    destroy: odds.destroy * scale,
    noChange: odds.noChange * scale,
    down: odds.down * scale,
    reset: odds.reset * scale
  };
}

function rollOutcome(odds) {
  const roll = Math.random() * 100;
  let threshold = odds.success;
  if (roll < threshold) {
    return "success";
  }

  threshold += odds.destroy;
  if (roll < threshold) {
    return "destroy";
  }

  threshold += odds.noChange;
  if (roll < threshold) {
    return "noChange";
  }

  threshold += odds.down;
  if (roll < threshold) {
    return "down";
  }

  return "reset";
}

function canUseStone(level) {
  return level >= 7 && level <= 10;
}

function canUseCrystal(level) {
  return level >= 11 && level <= 12;
}

export function createCashForgeGame({
  btnRecharge,
  btnReset,
  btnTabInventory,
  btnTabShop,
  btnTabEnhance,
  viewInventory,
  viewShop,
  viewEnhance,
  coinsGlobal,
  bagEquipment,
  bagRestoreScrolls,
  bagGuardianStones,
  bagGuardianCrystals,
  bagDoubleHammers,
  shopCoins,
  btnBuyRestorePack,
  btnBuyStonePack,
  btnBuyCrystalPack,
  equipmentSelect,
  btnEnhance,
  btnRestore,
  useStoneCheckbox,
  useCrystalCheckbox,
  useHammerCheckbox,
  enhanceCoins,
  enhanceLevel,
  enhanceRestoreScrolls,
  enhanceGuardianStones,
  enhanceGuardianCrystals,
  enhanceDoubleHammers,
  message,
  equipmentStatusList
}) {
  let coins = 0;
  let activeTab = "inventory";
  let equipmentState = createDefaultEquipmentState();
  let items = createDefaultItems();
  let messageKey = "cashForge.message.ready";
  let messageParams = {};

  function getEquipmentName(key) {
    return t(`cashForge.equipment.${key}`);
  }

  function getSelectedEquipmentKey() {
    return equipmentSelect.value;
  }

  function getSelectedEquipmentState() {
    return equipmentState[getSelectedEquipmentKey()];
  }

  function setMessage(key, params) {
    messageKey = key;
    messageParams = params || {};
    message.textContent = t(key, messageParams);
  }

  function refreshMessage() {
    message.textContent = t(messageKey, messageParams);
  }

  function renderCurrency() {
    const formatted = formatNumber(coins);
    coinsGlobal.textContent = formatted;
    shopCoins.textContent = formatted;
    enhanceCoins.textContent = formatted;
  }

  function renderInventory() {
    bagEquipment.textContent = t("cashForge.inventory.starterEquipment");
    bagRestoreScrolls.textContent = String(items.restoreScrolls);
    bagGuardianStones.textContent = String(items.guardianStones);
    bagGuardianCrystals.textContent = String(items.guardianCrystals);
    bagDoubleHammers.textContent = String(items.doubleHammers);
  }

  function createEquipmentStatusItem(key) {
    const data = equipmentState[key];
    const listItem = document.createElement("li");

    if (data.destroyed) {
      listItem.textContent = t("cashForge.enhance.statusDestroyed", {
        equipment: getEquipmentName(key),
        level: data.destroyedLevel
      });
      listItem.className = "cashforge-equipment-status-item is-destroyed";
      return listItem;
    }

    listItem.textContent = t("cashForge.enhance.statusNormal", {
      equipment: getEquipmentName(key),
      level: data.level
    });
    listItem.className = "cashforge-equipment-status-item";
    return listItem;
  }

  function renderEquipmentStatusList() {
    const list = document.createElement("ul");
    list.className = "cashforge-equipment-status-list";

    EQUIPMENT_KEYS.forEach(function (key) {
      list.appendChild(createEquipmentStatusItem(key));
    });

    equipmentStatusList.innerHTML = "";
    equipmentStatusList.appendChild(list);
  }

  function renderEnhanceView() {
    const selected = getSelectedEquipmentState();
    const level = selected.level;

    if (selected.destroyed) {
      enhanceLevel.textContent = t("cashForge.enhance.destroyedTag", {
        level: selected.destroyedLevel
      });
    } else {
      enhanceLevel.textContent = `+${level}`;
    }

    enhanceRestoreScrolls.textContent = String(items.restoreScrolls);
    enhanceGuardianStones.textContent = String(items.guardianStones);
    enhanceGuardianCrystals.textContent = String(items.guardianCrystals);
    enhanceDoubleHammers.textContent = String(items.doubleHammers);

    const stoneAllowed = canUseStone(level) && !selected.destroyed && level < MAX_ENHANCE_LEVEL;
    const crystalAllowed = canUseCrystal(level) && !selected.destroyed && level < MAX_ENHANCE_LEVEL;
    const hammerAllowed = !selected.destroyed && level < MAX_ENHANCE_LEVEL;

    useStoneCheckbox.disabled = !stoneAllowed || items.guardianStones <= 0;
    useCrystalCheckbox.disabled = !crystalAllowed || items.guardianCrystals <= 0;
    useHammerCheckbox.disabled = !hammerAllowed || items.doubleHammers <= 0;

    if (useStoneCheckbox.disabled) {
      useStoneCheckbox.checked = false;
    }

    if (useCrystalCheckbox.disabled) {
      useCrystalCheckbox.checked = false;
    }

    if (useHammerCheckbox.disabled) {
      useHammerCheckbox.checked = false;
    }

    btnEnhance.disabled = selected.destroyed || level >= MAX_ENHANCE_LEVEL;
    btnRestore.disabled = !selected.destroyed || items.restoreScrolls <= 0;
  }

  function renderAll() {
    renderCurrency();
    renderInventory();
    renderEnhanceView();
    renderEquipmentStatusList();
    refreshMessage();
  }

  function showTab(tabName) {
    activeTab = tabName;

    viewInventory.classList.toggle("hidden", tabName !== "inventory");
    viewShop.classList.toggle("hidden", tabName !== "shop");
    viewEnhance.classList.toggle("hidden", tabName !== "enhance");

    btnTabInventory.classList.toggle("active", tabName === "inventory");
    btnTabShop.classList.toggle("active", tabName === "shop");
    btnTabEnhance.classList.toggle("active", tabName === "enhance");
  }

  function recharge() {
    coins += RECHARGE_AMOUNT;
    setMessage("cashForge.message.recharged", { amount: formatNumber(RECHARGE_AMOUNT) });
    renderAll();
  }

  function buyPack(packKey) {
    const pack = SHOP_PACKS[packKey];

    if (coins < pack.cost) {
      setMessage("cashForge.message.notEnoughCoins");
      renderAll();
      return;
    }

    coins -= pack.cost;
    items[pack.itemKey] += pack.amount;

    setMessage("cashForge.message.purchaseSuccess", {
      pack: t(pack.nameKey),
      amount: pack.amount
    });
    renderAll();
  }

  function consumeProtectionItems(level) {
    const usage = {
      useStone: false,
      useCrystal: false,
      useHammer: false
    };

    if (useStoneCheckbox.checked) {
      if (!canUseStone(level)) {
        setMessage("cashForge.message.stoneRangeOnly");
        return null;
      }

      if (items.guardianStones <= 0) {
        setMessage("cashForge.message.noStone");
        return null;
      }

      items.guardianStones -= 1;
      usage.useStone = true;
    }

    if (useCrystalCheckbox.checked) {
      if (!canUseCrystal(level)) {
        setMessage("cashForge.message.crystalRangeOnly");
        return null;
      }

      if (items.guardianCrystals <= 0) {
        setMessage("cashForge.message.noCrystal");
        return null;
      }

      items.guardianCrystals -= 1;
      usage.useCrystal = true;
    }

    if (useHammerCheckbox.checked) {
      if (items.doubleHammers <= 0) {
        setMessage("cashForge.message.noDoubleHammer");
        return null;
      }

      items.doubleHammers -= 1;
      usage.useHammer = true;
    }

    return usage;
  }

  function resolveEnhanceOutcome(equipmentKey, outcome, previousLevel) {
    const equipment = equipmentState[equipmentKey];
    const equipmentName = getEquipmentName(equipmentKey);

    if (outcome === "success") {
      equipment.level = Math.min(MAX_ENHANCE_LEVEL, equipment.level + 1);
      setMessage("cashForge.message.enhanceSuccess", {
        equipment: equipmentName,
        from: previousLevel,
        to: equipment.level
      });
      return;
    }

    if (outcome === "destroy") {
      equipment.destroyed = true;
      equipment.destroyedLevel = previousLevel;

      if (items.restoreScrolls > 0) {
        items.restoreScrolls -= 1;
        equipment.destroyed = false;
        equipment.level = previousLevel;
        setMessage("cashForge.message.destroyAutoRestore", {
          equipment: equipmentName,
          level: previousLevel
        });
        return;
      }

      setMessage("cashForge.message.destroyed", {
        equipment: equipmentName,
        level: previousLevel
      });
      return;
    }

    if (outcome === "noChange") {
      setMessage("cashForge.message.enhanceNoChange", {
        equipment: equipmentName,
        level: previousLevel
      });
      return;
    }

    if (outcome === "down") {
      equipment.level = Math.max(0, equipment.level - 1);
      setMessage("cashForge.message.enhanceDown", {
        equipment: equipmentName,
        from: previousLevel,
        to: equipment.level
      });
      return;
    }

    equipment.level = 0;
    setMessage("cashForge.message.enhanceReset", {
      equipment: equipmentName,
      from: previousLevel
    });
  }

  function enhanceSelectedEquipment() {
    const equipmentKey = getSelectedEquipmentKey();
    const equipment = equipmentState[equipmentKey];
    const level = equipment.level;

    if (equipment.destroyed) {
      setMessage("cashForge.message.cannotEnhanceDestroyed", {
        equipment: getEquipmentName(equipmentKey)
      });
      renderAll();
      return;
    }

    if (level >= MAX_ENHANCE_LEVEL) {
      setMessage("cashForge.message.maxLevel", {
        equipment: getEquipmentName(equipmentKey)
      });
      renderAll();
      return;
    }

    const usage = consumeProtectionItems(level);
    if (!usage) {
      renderAll();
      return;
    }

    let odds = { ...ENHANCE_PROBABILITIES[level] };

    if (usage.useHammer) {
      odds = applyDoubleHammer(odds);
    }

    let outcome = rollOutcome(odds);

    if (usage.useStone && (outcome === "down" || outcome === "reset")) {
      outcome = "noChange";
    }

    if (usage.useCrystal && outcome === "reset") {
      outcome = "noChange";
    }

    resolveEnhanceOutcome(equipmentKey, outcome, level);
    renderAll();
  }

  function restoreSelectedEquipment() {
    const equipmentKey = getSelectedEquipmentKey();
    const equipment = equipmentState[equipmentKey];

    if (!equipment.destroyed) {
      setMessage("cashForge.message.restoreNotNeeded", {
        equipment: getEquipmentName(equipmentKey)
      });
      renderAll();
      return;
    }

    if (items.restoreScrolls <= 0) {
      setMessage("cashForge.message.noRestoreScroll");
      renderAll();
      return;
    }

    items.restoreScrolls -= 1;
    equipment.destroyed = false;
    equipment.level = equipment.destroyedLevel;

    setMessage("cashForge.message.restoreSuccess", {
      equipment: getEquipmentName(equipmentKey),
      level: equipment.level
    });
    renderAll();
  }

  function resetGame() {
    coins = 0;
    equipmentState = createDefaultEquipmentState();
    items = createDefaultItems();
    equipmentSelect.value = "weapon";
    useStoneCheckbox.checked = false;
    useCrystalCheckbox.checked = false;
    useHammerCheckbox.checked = false;
    setMessage("cashForge.message.ready");
    showTab("inventory");
    renderAll();
  }

  btnRecharge.addEventListener("click", function (event) {
    event.currentTarget.blur();
    recharge();
  });

  btnReset.addEventListener("click", function (event) {
    event.currentTarget.blur();
    resetGame();
  });

  btnTabInventory.addEventListener("click", function (event) {
    event.currentTarget.blur();
    showTab("inventory");
  });

  btnTabShop.addEventListener("click", function (event) {
    event.currentTarget.blur();
    showTab("shop");
  });

  btnTabEnhance.addEventListener("click", function (event) {
    event.currentTarget.blur();
    showTab("enhance");
  });

  btnBuyRestorePack.addEventListener("click", function (event) {
    event.currentTarget.blur();
    buyPack("restore");
  });

  btnBuyStonePack.addEventListener("click", function (event) {
    event.currentTarget.blur();
    buyPack("stone");
  });

  btnBuyCrystalPack.addEventListener("click", function (event) {
    event.currentTarget.blur();
    buyPack("crystal");
  });

  equipmentSelect.addEventListener("change", renderAll);

  btnEnhance.addEventListener("click", function (event) {
    event.currentTarget.blur();
    enhanceSelectedEquipment();
  });

  btnRestore.addEventListener("click", function (event) {
    event.currentTarget.blur();
    restoreSelectedEquipment();
  });

  resetGame();

  return {
    enter: resetGame,
    refreshLocale: renderAll
  };
}
