import { Decimal, ZERO, d, type DecimalInput } from "./decimal";
import { currencyPolicy, roundToCurrency, type CurrencyCode } from "./currency";

export class CurrencyMismatchError extends Error {
  constructor(a: CurrencyCode, b: CurrencyCode) {
    super(`Currency mismatch: ${a} vs ${b}`);
    this.name = "CurrencyMismatchError";
  }
}

/** An amount with an explicit currency. Immutable. */
export class Money {
  readonly amount: Decimal;
  readonly currency: CurrencyCode;

  constructor(amount: DecimalInput, currency: CurrencyCode) {
    currencyPolicy(currency); // validates the code
    this.amount = d(amount);
    this.currency = currency;
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(ZERO, currency);
  }

  private same(other: Money): void {
    if (other.currency !== this.currency) throw new CurrencyMismatchError(this.currency, other.currency);
  }

  plus(other: Money): Money {
    this.same(other);
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  minus(other: Money): Money {
    this.same(other);
    return new Money(this.amount.minus(other.amount), this.currency);
  }

  times(factor: DecimalInput): Money {
    return new Money(this.amount.times(d(factor)), this.currency);
  }

  negated(): Money {
    return new Money(this.amount.negated(), this.currency);
  }

  rounded(): Money {
    return new Money(roundToCurrency(this.amount, this.currency), this.currency);
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount.equals(other.amount);
  }

  toJSON(): { amount: string; currency: CurrencyCode } {
    return { amount: this.amount.toFixed(), currency: this.currency };
  }

  toString(): string {
    return `${this.rounded().amount.toFixed(currencyPolicy(this.currency).minorUnits)} ${this.currency}`;
  }
}

export function sumMoney(items: Iterable<Money>, currency: CurrencyCode): Money {
  let total = Money.zero(currency);
  for (const m of items) total = total.plus(m);
  return total;
}
