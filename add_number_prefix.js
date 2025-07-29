const addPrefixToPhoneNumber = (phoneNumber) => {
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  if (digitsOnly.startsWith("0")) {
    // If the number starts with 0, replace it with +255
    return `+255${digitsOnly.slice(1)}`;
  } else if (digitsOnly.startsWith("255")) {
    // If the number starts with 255, add the plus sign
    return `+${digitsOnly}`;
  } else if (phoneNumber.startsWith("+255")) {
    // If the number already starts with +255, return it as is
    return phoneNumber;
  } else {
    // Return the number as is if it doesn't match any conditions
    return digitsOnly;
  }
};

module.exports = addPrefixToPhoneNumber;
