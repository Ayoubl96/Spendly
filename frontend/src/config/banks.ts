export interface BankConfig {
  id: string;
  name: string;
  displayName: string;
  code: string;
  country: {
    code: string;
    name: string;
  };
  logo?: string;
  website?: string;
}

export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  {
    code: "IT",
    name: "Italy",
    flag: "🇮🇹",
  },
  // Easy to add more countries later
  // {
  //   code: 'ES',
  //   name: 'Spain',
  //   flag: '🇪🇸'
  // },
  // {
  //   code: 'FR',
  //   name: 'France',
  //   flag: '🇫🇷'
  // }
];

export const SUPPORTED_BANKS: BankConfig[] = [
  {
    id: "intesa-sanpaolo-it",
    name: "Intesa Sanpaolo",
    displayName: "Intesa Sanpaolo",
    code: "BCITITMM",
    country: {
      code: "IT",
      name: "Italy",
    },
    logo: "/banks/intesa-sanpaolo.png",
    website: "https://www.intesasanpaolo.com",
  },
  {
    id: "revolut-it",
    name: "Revolut",
    displayName: "Revolut Italia",
    code: "REVOLT21",
    country: {
      code: "IT",
      name: "Italy",
    },
    logo: "/banks/revolut.png",
    website: "https://www.revolut.com/it-IT",
  },
  {
    id: "paypal-it",
    name: "PayPal",
    displayName: "PayPal Italia",
    code: "PPALUS33",
    country: {
      code: "IT",
      name: "Italy",
    },
    logo: "/banks/paypal.png",
    website: "https://www.paypal.com/it",
  },
];

// Helper functions
export const getBanksByCountry = (countryCode: string): BankConfig[] => {
  return SUPPORTED_BANKS.filter((bank) => bank.country.code === countryCode);
};

export const getBankById = (bankId: string): BankConfig | undefined => {
  return SUPPORTED_BANKS.find((bank) => bank.id === bankId);
};

export const getCountryByCode = (
  countryCode: string,
): CountryConfig | undefined => {
  return SUPPORTED_COUNTRIES.find((country) => country.code === countryCode);
};
