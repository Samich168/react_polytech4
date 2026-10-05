import { useState } from "react";
import "./DiscountCalculator.css";


const CATEGORIES = [
  { id: "electronics", label: "Электроника", discount: 5 },
  { id: "clothing",    label: "Одежда",      discount: 15 },
  { id: "groceries",   label: "Продукты",    discount: 10 },
  { id: "books",       label: "Книги",       discount: 20 },
  { id: "other",       label: "Другое",      discount: 0 },
];

const VAT_RATE = 0.22;

// Доп. задание «Промокод»: код и размер дополнительной скидки
const PROMO_CODE = "WELCOME10";
const PROMO_DISCOUNT = 10;

// Доп. задание «Кастомная скидка»: границы ползунка
const CUSTOM_DISCOUNT_MIN = 0;
const CUSTOM_DISCOUNT_MAX = 50;

// Доп. задание «История расчётов»: сколько последних расчётов хранить
const HISTORY_LIMIT = 5;

// Счётчики для уникальных id (нужны для key в списках)
let nextItemId = 1;
let nextHistoryId = 1;

// Доп. задание «Несколько товаров»: создаёт пустую позицию
function createItem(id) {
  return { id, price: "", category: "electronics", error: "" };
}

// Чистая функция расчёта: принимает список позиций и параметры,
// возвращает все суммы. Используется и для показа результата,
// и для записи в историю.
function calculateOrder({ items, customDiscount, promoApplied, withVat }) {
  const lines = items.map((item) => {
    const category = CATEGORIES.find((c) => c.id === item.category);
    const price = parseFloat(item.price) || 0;

    // Кастомная скидка (если включена) заменяет скидку категории,
    // промокод добавляется поверх
    const baseDiscount = customDiscount !== null ? customDiscount : category.discount;
    const percent = baseDiscount + (promoApplied ? PROMO_DISCOUNT : 0);

    const discountAmount = price * (percent / 100);
    return {
      id: item.id,
      label: category.label,
      price,
      percent,
      discountAmount,
      priceAfterDiscount: price - discountAmount,
    };
  });

  const sumBy = (key) => lines.reduce((acc, line) => acc + line[key], 0);

  const subtotal = sumBy("price");
  const discountTotal = sumBy("discountAmount");
  const priceAfterDiscount = sumBy("priceAfterDiscount");
  // Доп. задание «Переключатель НДС»: НДС добавляем только если он включён
  const vatAmount = withVat ? priceAfterDiscount * VAT_RATE : 0;
  const total = priceAfterDiscount + vatAmount;

  return { lines, subtotal, discountTotal, priceAfterDiscount, vatAmount, total };
}

function DiscountCalculator() {
  // --- Состояние ---
  // Доп. задание «Несколько товаров»: вместо одной цены — массив позиций.
  // Каждая позиция: { id, price, category, error }
  const [items, setItems] = useState([createItem(0)]);
  // Признак того, что пользователь нажал «Рассчитать»
  // До первого нажатия результаты не показываем
  const [calculated, setCalculated] = useState(false);

  // Доп. задание «Промокод»
  const [promo, setPromo] = useState("");

  // Доп. задание «Кастомная скидка»
  const [useCustomDiscount, setUseCustomDiscount] = useState(false);
  const [customDiscount, setCustomDiscount] = useState(10);

  // Доп. задание «Переключатель НДС»
  const [withVat, setWithVat] = useState(true);

  // Доп. задание «История расчётов»
  const [history, setHistory] = useState([]);

  // Промокод действует, если введён правильный код (регистр не важен)
  const promoApplied = promo.trim().toUpperCase() === PROMO_CODE;

  // Параметры, общие для всех позиций
  const options = {
    customDiscount: useCustomDiscount ? customDiscount : null,
    promoApplied,
    withVat,
  };

  // --- Обработчики событий ---
  // Вспомогательная функция: изменить поля одной позиции по её id
  function updateItem(id, changes) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  }

  // Изменение цены: разрешаем только цифры и точку
  function handlePriceChange(id, value) {
    // Разрешаем пустую строку (чтобы пользователь мог стереть поле)
    // и числа с одной точкой
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      updateItem(id, { price: value, error: "" }); // Сбрасываем ошибку при вводе
      setCalculated(false); // Пересчёт нужен заново
    }
  }

  // Изменение категории
  function handleCategoryChange(id, value) {
    updateItem(id, { category: value });
    setCalculated(false); // Категория изменилась — результаты устарели
  }

  // Доп. задание «Несколько товаров»: добавить и удалить позицию
  function handleAddItem() {
    setItems((prev) => [...prev, createItem(nextItemId++)]);
    setCalculated(false);
  }

  function handleRemoveItem(id) {
    // Последнюю позицию удалять нельзя
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    setCalculated(false);
  }

  function handlePromoChange(e) {
    setPromo(e.target.value);
    setCalculated(false);
  }

  function handleUseCustomChange(e) {
    setUseCustomDiscount(e.target.checked);
    setCalculated(false);
  }

  function handleCustomDiscountChange(e) {
    setCustomDiscount(Number(e.target.value));
    setCalculated(false);
  }

  function handleVatChange(value) {
    setWithVat(value);
    setCalculated(false);
  }

  // Нажатие кнопки «Рассчитать»
  function handleCalculate() {
    let hasError = false;

    // Валидируем цену каждой позиции
    const checkedItems = items.map((item) => {
      const numPrice = parseFloat(item.price);

      // Валидация: пустое поле
      if (!item.price.trim()) {
        hasError = true;
        return { ...item, error: "Введите цену товара" };
      }

      // Валидация: не число или отрицательное
      if (isNaN(numPrice) || numPrice <= 0) {
        hasError = true;
        return { ...item, error: "Цена должна быть положительным числом" };
      }

      return { ...item, error: "" };
    });

    setItems(checkedItems);

    if (hasError) {
      setCalculated(false);
      return;
    }

    // Валидация прошла — показываем результаты
    setCalculated(true);

    // Доп. задание «История расчётов»: запоминаем расчёт,
    // храним только последние HISTORY_LIMIT штук (новые — сверху)
    const result = calculateOrder({ items: checkedItems, ...options });
    const notes = [];
    notes.push(withVat ? "с НДС" : "без НДС");
    if (useCustomDiscount) notes.push(`своя скидка ${customDiscount}%`);
    if (promoApplied) notes.push("промокод");

    const entry = {
      id: nextHistoryId++,
      time: new Date().toLocaleTimeString("ru-RU"),
      itemsCount: checkedItems.length,
      total: result.total,
      notes: notes.join(", "),
    };
    setHistory((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT));
  }

  // Сброс формы (историю не трогаем — у неё своя кнопка очистки)
  function handleReset() {
    setItems([createItem(nextItemId++)]);
    setPromo("");
    setUseCustomDiscount(false);
    setCustomDiscount(10);
    setWithVat(true);
    setCalculated(false);
  }

  function handleClearHistory() {
    setHistory([]);
  }

  // --- Вычисления ---
  // Все вычисления проводим только если calculated === true
  const order = calculated ? calculateOrder({ items, ...options }) : null;

  // Вспомогательная функция: форматирование в рублях
  function formatRub(value) {
    return value.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // --- Разметка ---

  return (
    <div className="calculator-wrapper">
      <h2 className="calculator-title">Калькулятор скидок</h2>

      {/* Список товаров: у каждого своя цена и категория */}
      {items.map((item, index) => (
        <div className="item" key={item.id}>
          <div className="item__header">
            <span className="item__title">Товар {index + 1}</span>
            <button
              type="button"
              className="item__remove"
              onClick={() => handleRemoveItem(item.id)}
              disabled={items.length === 1}
              aria-label={`Удалить товар ${index + 1}`}
            >
              Удалить
            </button>
          </div>

          {/* Поле ввода цены */}
          <div className="field">
            <label htmlFor={`price-${item.id}`} className="field__label">
              Цена товара (₽)
            </label>
            <input
              id={`price-${item.id}`}
              type="text"
              className={`field__input ${item.error ? "field__input--error" : ""}`}
              value={item.price}
              onChange={(e) => handlePriceChange(item.id, e.target.value)}
              placeholder="Например: 1000"
              inputMode="decimal"
            />
            {/* Показываем ошибку, если она есть */}
            {item.error && <span className="field__error">{item.error}</span>}
          </div>

          {/* Выбор категории */}
          <div className="field">
            <label htmlFor={`category-${item.id}`} className="field__label">
              Категория товара
            </label>
            <select
              id={`category-${item.id}`}
              className="field__input field__select"
              value={item.category}
              onChange={(e) => handleCategoryChange(item.id, e.target.value)}
            >
              {/* Генерируем <option> из справочника категорий */}
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label} — скидка {cat.discount}%
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn--add" onClick={handleAddItem}>
        + Добавить товар
      </button>

      {/* Доп. задание «Промокод» */}
      <div className="field">
        <label htmlFor="promo" className="field__label">
          Промокод
        </label>
        <input
          id="promo"
          type="text"
          className="field__input"
          value={promo}
          onChange={handlePromoChange}
          placeholder="Введите промокод"
          autoComplete="off"
        />
        {promoApplied && (
          <span className="field__hint field__hint--ok">
            Промокод применён: +{PROMO_DISCOUNT}% к скидке
          </span>
        )}
        {promo.trim() !== "" && !promoApplied && (
          <span className="field__hint field__hint--warn">Промокод не найден</span>
        )}
      </div>

      {/* Доп. задание «Кастомная скидка» */}
      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={useCustomDiscount}
            onChange={handleUseCustomChange}
          />
          Задать скидку вручную (вместо скидки категории)
        </label>
        <div className="slider-row">
          <input
            type="range"
            className="slider-row__range"
            min={CUSTOM_DISCOUNT_MIN}
            max={CUSTOM_DISCOUNT_MAX}
            step="1"
            value={customDiscount}
            onChange={handleCustomDiscountChange}
            disabled={!useCustomDiscount}
            aria-label="Скидка, %"
          />
          <span className="slider-row__value">{customDiscount}%</span>
        </div>
      </div>

      {/* Доп. задание «Переключатель НДС» */}
      <div className="field">
        <span className="field__label">НДС</span>
        <div className="radio-group">
          <label className="radio">
            <input
              type="radio"
              name="vat"
              checked={withVat}
              onChange={() => handleVatChange(true)}
            />
            С НДС (22%)
          </label>
          <label className="radio">
            <input
              type="radio"
              name="vat"
              checked={!withVat}
              onChange={() => handleVatChange(false)}
            />
            Без НДС
          </label>
        </div>
      </div>

      {/* Кнопки */}
      <div className="actions">
        <button type="button" className="btn btn--primary" onClick={handleCalculate}>
          Рассчитать
        </button>
        <button type="button" className="btn btn--secondary" onClick={handleReset}>
          Сбросить
        </button>
      </div>

      {/* Результаты — показываем только после расчёта */}
      {order && (
        <div className="results">
          <h3 className="results__title">Результат расчёта</h3>

          {/* Таблица по позициям */}
          <table className="results__table results__table--items">
            <thead>
              <tr>
                <th>Товар</th>
                <th>Цена</th>
                <th>Скидка</th>
                <th>Со скидкой</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line, index) => (
                <tr key={line.id}>
                  <td>
                    {index + 1}. {line.label}
                  </td>
                  <td className="results__value">{formatRub(line.price)} ₽</td>
                  <td className="results__value results__value--discount">
                    {line.percent}%
                  </td>
                  <td className="results__value">
                    {formatRub(line.priceAfterDiscount)} ₽
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Итоги по всем позициям */}
          <table className="results__table results__table--totals">
            <tbody>
              <tr>
                <td>Исходная сумма</td>
                <td className="results__value">{formatRub(order.subtotal)} ₽</td>
              </tr>
              <tr>
                <td>Скидка</td>
                <td className="results__value results__value--discount">
                  −{formatRub(order.discountTotal)} ₽
                </td>
              </tr>
              <tr>
                <td>Цена после скидки</td>
                <td className="results__value">
                  {formatRub(order.priceAfterDiscount)} ₽
                </td>
              </tr>
              {withVat && (
                <tr>
                  <td>НДС (22%)</td>
                  <td className="results__value">+{formatRub(order.vatAmount)} ₽</td>
                </tr>
              )}
              <tr className="results__row--total">
                <td>Итого к оплате</td>
                <td className="results__value">{formatRub(order.total)} ₽</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Доп. задание «История расчётов»: последние 5 расчётов */}
      {history.length > 0 && (
        <div className="history">
          <div className="history__header">
            <h3 className="results__title">История расчётов</h3>
            <button type="button" className="history__clear" onClick={handleClearHistory}>
              Очистить
            </button>
          </div>
          <ul className="history__list">
            {history.map((entry) => (
              <li className="history__item" key={entry.id}>
                <span className="history__time">{entry.time}</span>
                <span className="history__text">
                  {entry.itemsCount} поз., {entry.notes}
                </span>
                <span className="history__total">{formatRub(entry.total)} ₽</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default DiscountCalculator;
