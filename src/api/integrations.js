const PRICES = { BTC: 105000, ETH: 2400, BNB: 600, SOL: 130 }; 
 
export const InvokeLLM = async (options = {}) => { 
  const prompt = options.prompt || ''; 
  const match = prompt.match(/current price of (\w+)/i); 
  if (match && options.add_context_from_internet) { 
    const coin = match[1].toUpperCase(); 
    const basePrice = PRICES[coin] || 100; 
    const variation = (Math.random() - 0.5) * 0.02; 
    const price = basePrice * (1 + variation); 
    console.log(`[Price] ${coin}: $${price.toFixed(4)}`); 
    return { success: true, price: price }; 
  } 
  return { success: true, data: { response: 'Mock response' } }; 
}; 
export const SendEmail = async () => ({ success: true }); 
export const UploadFile = async () => ({ success: true });  
export const GenerateImage = async () => ({ success: true });  
export const ExtractDataFromUploadedFile = async () => ({ success: true }); 
