import fetch from 'node-fetch';

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body);

    // Construct payload, including address fields
    const payload = {
      name: data.name,
      relation: data.relation,
      birthdate: data.birthdate || "",
      age: data.age || "",
      medicaid: data.medicaid,
      medicaid_number: data.medicaid_number,
      email: data.email,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      county: data.county || "",
      info: data.info
    };

    // Google Apps Script endpoint
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbzSbjRvXSXATOWf-4IHLu8C5hkR8JpjGHuF5JgQN4eBMnsUVFttKL5OHwKW0D_FMpm5/exec';

    // Send data to Google Apps Script
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script error: ${response.statusText}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ message: 'Lead submitted successfully' }),
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
