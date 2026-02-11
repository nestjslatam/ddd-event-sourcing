import { Money } from './money.vo';

describe('Money Value Object', () => {
  describe('create', () => {
    it('should create money with valid amount and currency', () => {
      const money = Money.create(100, 'USD');

      expect(money.amount).toBe(100);
      expect(money.currency).toBe('USD');
    });

    it('should throw error for negative amount', () => {
      expect(() => Money.create(-50, 'USD')).toThrow(
        'Money amount cannot be negative',
      );
    });

    it('should allow zero amount', () => {
      const money = Money.create(0, 'EUR');

      expect(money.amount).toBe(0);
    });

    it('should create money with different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(100, 'EUR');
      const gbp = Money.create(100, 'GBP');

      expect(usd.currency).toBe('USD');
      expect(eur.currency).toBe('EUR');
      expect(gbp.currency).toBe('GBP');
    });
  });

  describe('add', () => {
    it('should add money with same currency', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'USD');

      const result = money1.add(money2);

      expect(result.amount).toBe(150);
      expect(result.currency).toBe('USD');
    });

    it('should throw error when adding different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(50, 'EUR');

      expect(() => usd.add(eur)).toThrow('Currencies must match');
    });

    it('should not mutate original money objects', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'USD');

      money1.add(money2);

      expect(money1.amount).toBe(100);
      expect(money2.amount).toBe(50);
    });

    it('should handle adding zero', () => {
      const money = Money.create(100, 'USD');
      const zero = Money.create(0, 'USD');

      const result = money.add(zero);

      expect(result.amount).toBe(100);
    });
  });

  describe('subtract', () => {
    it('should subtract money with same currency', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(30, 'USD');

      const result = money1.subtract(money2);

      expect(result.amount).toBe(70);
      expect(result.currency).toBe('USD');
    });

    it('should throw error when subtracting different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(30, 'EUR');

      expect(() => usd.subtract(eur)).toThrow('Currencies must match');
    });

    it('should throw error for insufficient funds', () => {
      const money1 = Money.create(50, 'USD');
      const money2 = Money.create(100, 'USD');

      expect(() => money1.subtract(money2)).toThrow('Insufficient funds');
    });

    it('should allow subtracting to zero', () => {
      const money = Money.create(100, 'USD');
      const same = Money.create(100, 'USD');

      const result = money.subtract(same);

      expect(result.amount).toBe(0);
    });

    it('should not mutate original money objects', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(30, 'USD');

      money1.subtract(money2);

      expect(money1.amount).toBe(100);
      expect(money2.amount).toBe(30);
    });
  });

  describe('equality', () => {
    it('should be equal for same amount and currency', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(100, 'USD');

      expect(money1.equals(money2)).toBe(true);
    });

    it('should not be equal for different amounts', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(200, 'USD');

      expect(money1.equals(money2)).toBe(false);
    });

    it('should not be equal for different currencies', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(100, 'EUR');

      expect(money1.equals(money2)).toBe(false);
    });

    it('should not be equal for both different amount and currency', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(200, 'EUR');

      expect(money1.equals(money2)).toBe(false);
    });
  });

  describe('getValue', () => {
    it('should return props object', () => {
      const money = Money.create(150, 'GBP');

      const value = money.getValue();

      expect(value).toEqual({ amount: 150, currency: 'GBP' });
    });
  });
});
