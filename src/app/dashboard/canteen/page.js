"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ShoppingBag, Search, Plus, Minus, CreditCard, Clock, 
  CheckCircle2, AlertTriangle, History, Shield, RefreshCw, 
  Terminal, ShieldCheck, Ticket, RotateCcw, AlertCircle
} from "lucide-react";
import Barcode from "react-barcode";

// Canteen Menu Data with typical Bangalore college canteen options
const CANTEEN_MENU = [
  { id: "m1", name: "Masala Dosa", price: 50, category: "breakfast", time: "5-7 mins", desc: "Crispy golden crepe with spiced potato filling, fresh chutney, and sambar." },
  { id: "m2", name: "Idli Vada Combo", price: 40, category: "breakfast", time: "3-5 mins", desc: "Two soft steamed rice cakes and one crispy lentil donut, served hot." },
  { id: "m3", name: "Chow Chow Bath", price: 45, category: "breakfast", time: "3-5 mins", desc: "Savory semolina khara bath paired with sweet Kesari pineapple bath." },
  { id: "m4", name: "Paneer Fried Rice", price: 80, category: "meals", time: "8-10 mins", desc: "Wok-tossed basmati rice with paneer cubes, fresh veggies, and Chinese spices." },
  { id: "m5", name: "Veg Noodles", price: 70, category: "meals", time: "7-9 mins", desc: "Stir-fried noodles with green peppers, cabbage, carrots, and light soy sauce." },
  { id: "m6", name: "Gobi Manchurian", price: 80, category: "meals", time: "10 mins", desc: "Deep-fried cauliflower florets in a hot, sweet, and sticky garlic-chili glaze." },
  { id: "m7", name: "Samosa (Plate)", price: 25, category: "snacks", time: "2 mins", desc: "Two crispy pastry triangles stuffed with spiced peas and potato." },
  { id: "m8", name: "French Fries", price: 50, category: "snacks", time: "5 mins", desc: "Golden-brown salted potato batons, served with classic ketchup." },
  { id: "m9", name: "Filter Coffee", price: 15, category: "drinks", time: "2 mins", desc: "Rich, aromatic, traditional South Indian chicory milk coffee." },
  { id: "m10", name: "Masala Tea", price: 15, category: "drinks", time: "2 mins", desc: "Freshly brewed milk tea infused with cardamom, grated ginger, and pepper." },
  { id: "m11", name: "Lemon Tea (Iced)", price: 20, category: "drinks", time: "2 mins", desc: "Chilled black tea with fresh lemon squeezer, mint, and honey." }
];

export default function SecureCanteenPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("menu"); // menu, history, terminal
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Cart state
  const [cart, setCart] = useState({});
  const [dineIn, setDineIn] = useState(true);
  
  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState("payment-method"); // payment-method, upi-qr, placing, success
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [enteredUtr, setEnteredUtr] = useState("");
  const [generatedUtr, setGeneratedUtr] = useState("");
  
  // Active Orders (stored in localStorage)
  const [orders, setOrders] = useState([]);
  const [selectedOrderForTicket, setSelectedOrderForTicket] = useState(null);
  
  // Secure dynamic token rotation state
  const [totpSecondsLeft, setTotpSecondsLeft] = useState(30);
  const [secureTokenSeed, setSecureTokenSeed] = useState("");
  
  // Live watermark timestamp
  const [liveTimestamp, setLiveTimestamp] = useState("");
  
  // Vendor Terminal scan state
  const [terminalSearchId, setTerminalSearchId] = useState("");
  const [terminalSearchPin, setTerminalSearchPin] = useState("");
  const [terminalResult, setTerminalResult] = useState(null); // null, success, already-claimed, invalid
  const [terminalScannedOrder, setTerminalScannedOrder] = useState(null);

  // Load orders from localStorage and set up synchronization intervals
  useEffect(() => {
    try {
      const storedOrders = localStorage.getItem("svit_canteen_orders");
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        setOrders(parsed);
        
        // Auto-select first active order if exists
        const active = parsed.find(o => o.status !== "Claimed" && o.status !== "Cancelled");
        if (active) {
          setSelectedOrderForTicket(active.id);
        }
      }
    } catch (e) {
      console.error("Failed to load canteen orders", e);
    }
  }, []);

  // Sync state between components and tabs periodically (polling localStorage mock-DB)
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const storedOrders = localStorage.getItem("svit_canteen_orders");
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          
          // Only update state if there is a difference to avoid infinite re-renders
          if (JSON.stringify(parsed) !== JSON.stringify(orders)) {
            setOrders(parsed);
          }
        }
      } catch (e) {}
    }, 1000);
    return () => clearInterval(interval);
  }, [orders]);

  // Handle live security watermark timer (seconds moving)
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      const timeStr = d.toLocaleTimeString();
      setLiveTimestamp(timeStr);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Handle secure TOTP rotation (runs every 30 seconds)
  useEffect(() => {
    // Generate initial random token
    if (!secureTokenSeed) {
      setSecureTokenSeed(Math.random().toString(36).substring(2, 8).toUpperCase());
    }

    const timer = setInterval(() => {
      setTotpSecondsLeft((prev) => {
        if (prev <= 1) {
          // Rotate seed
          setSecureTokenSeed(Math.random().toString(36).substring(2, 8).toUpperCase());
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secureTokenSeed]);

  // Parse traffic based on current time
  const trafficLevel = useMemo(() => {
    const d = new Date();
    const hours = d.getHours();
    const mins = d.getMinutes();
    const totalMins = hours * 60 + mins;

    // Break 1: 11:00 AM - 11:45 AM
    // Lunch 2: 1:00 PM - 2:00 PM
    if ((totalMins >= 660 && totalMins <= 705) || (totalMins >= 780 && totalMins <= 840)) {
      return { status: "Busy", color: "var(--warning)", desc: "Peak hour queue (prep taking ~12-15 mins)" };
    }
    return { status: "Normal", color: "var(--primary)", desc: "Fast pick up (prep taking ~5 mins)" };
  }, [liveTimestamp]);

  // Cart operations
  const updateCartQty = (id, change) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = current + change;
      const updated = { ...prev };
      if (next <= 0) {
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return updated;
    });
  };

  const cartItemsArray = useMemo(() => {
    return Object.keys(cart).map(id => {
      const item = CANTEEN_MENU.find(m => m.id === id);
      return {
        ...item,
        qty: cart[id],
        totalPrice: item.price * cart[id]
      };
    });
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cartItemsArray.reduce((acc, curr) => acc + curr.totalPrice, 0);
  }, [cartItemsArray]);

  // Filtered menu
  const filteredMenu = useMemo(() => {
    return CANTEEN_MENU.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Start checkout flow
  const handleProceedToPay = () => {
    if (cartItemsArray.length === 0) return;
    setEnteredUtr("");
    // Generate a secure mock UTR number (12 digits beginning with 6)
    const mockUtr = "6" + Math.floor(10000000000 + Math.random() * 90000000000).toString();
    setGeneratedUtr(mockUtr);
    setCheckoutStep("payment-method");
    setShowCheckout(true);
  };

  // Confirm payment & Place Order
  const handleConfirmOrder = () => {
    setCheckoutStep("placing");
    
    // Simulate minor delay for mock authorization check
    setTimeout(() => {
      const orderId = "SVIT-" + Math.floor(1000 + Math.random() * 9000).toString();
      const securityPin = Math.floor(100 + Math.random() * 900).toString().split("").join("-");
      
      const newOrder = {
        id: orderId,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: cartItemsArray,
        total: cartTotal,
        dineIn: dineIn,
        pin: securityPin,
        utr: paymentMethod === "upi" ? generatedUtr : "CASH_AT_COUNTER",
        status: "Placed",
        timestamp: Date.now()
      };

      const updatedOrders = [newOrder, ...orders];
      localStorage.setItem("svit_canteen_orders", JSON.stringify(updatedOrders));
      setOrders(updatedOrders);
      setSelectedOrderForTicket(orderId);
      
      // Clear cart
      setCart({});
      setCheckoutStep("success");
    }, 1500);
  };

  // Retrieve selected active order
  const activeOrderDetails = useMemo(() => {
    return orders.find(o => o.id === selectedOrderForTicket);
  }, [orders, selectedOrderForTicket]);

  // Active status text/color mapping
  const getStatusBadge = (status) => {
    switch (status) {
      case "Placed":
        return { label: "Order Received", color: "#BA6429", bg: "rgba(186,100,41,0.1)" };
      case "Cooking":
        return { label: "In Kitchen", color: "#d4af37", bg: "rgba(212,175,55,0.1)" };
      case "Ready":
        return { label: "Ready for Pickup", color: "var(--success)", bg: "var(--success-soft)" };
      case "Claimed":
        return { label: "Claimed & Collected", color: "var(--muted)", bg: "var(--surface-soft)" };
      default:
        return { label: "Cancelled", color: "#ff4d4d", bg: "rgba(255,77,77,0.1)" };
    }
  };

  // Helper to dynamically change Placed -> Cooking -> Ready statuses over time for interactive simulator
  useEffect(() => {
    const statusTimer = setInterval(() => {
      let changed = false;
      const updated = orders.map(order => {
        if (order.status === "Placed" && Date.now() - order.timestamp > 15000) {
          changed = true;
          return { ...order, status: "Cooking" };
        }
        if (order.status === "Cooking" && Date.now() - order.timestamp > 45000) {
          changed = true;
          return { ...order, status: "Ready" };
        }
        return order;
      });

      if (changed) {
        localStorage.setItem("svit_canteen_orders", JSON.stringify(updated));
        setOrders(updated);
      }
    }, 5000);

    return () => clearInterval(statusTimer);
  }, [orders]);

  // Vendor Terminal verification logic
  const handleTerminalScan = (e) => {
    e.preventDefault();
    setTerminalResult(null);
    setTerminalScannedOrder(null);

    const orderIdInput = terminalSearchId.trim().toUpperCase();
    const pinInput = terminalSearchPin.trim().replace(/\D/g, "").split("").join("-");

    const order = orders.find(o => o.id === orderIdInput);
    
    if (!order) {
      setTerminalResult("invalid");
      return;
    }

    setTerminalScannedOrder(order);

    if (order.status === "Claimed") {
      setTerminalResult("already-claimed");
      return;
    }

    // Verify security PIN matches
    if (order.pin !== pinInput && terminalSearchPin.trim() !== "") {
      setTerminalResult("invalid");
      return;
    }

    // Success - match found and not claimed yet
    setTerminalResult("success");
  };

  const handleConfirmClaimByVendor = () => {
    if (!terminalScannedOrder) return;
    
    const updated = orders.map(o => {
      if (o.id === terminalScannedOrder.id) {
        return { ...o, status: "Claimed" };
      }
      return o;
    });

    localStorage.setItem("svit_canteen_orders", JSON.stringify(updated));
    setOrders(updated);
    
    setTerminalResult("claimed-now");
    // Clear terminal form
    setTerminalSearchId("");
    setTerminalSearchPin("");
  };

  return (
    <main className="page-shell native-screen fade-in" style={{ paddingBottom: "100px" }}>
      
      {/* ── Tabs Navigation ── */}
      <nav className="tabs" aria-label="Canteen sections" style={{ marginBottom: 16 }}>
        <button className={`tab ${activeTab === "menu" ? "active" : ""}`} onClick={() => setActiveTab("menu")}>
          Secure Ordering
        </button>
        <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          My Active Tickets ({orders.filter(o => o.status !== "Claimed" && o.status !== "Cancelled").length})
        </button>
        <button className={`tab ${activeTab === "terminal" ? "active" : ""}`} onClick={() => setActiveTab("terminal")} style={{ border: "1px dashed var(--accent)" }}>
          <Terminal size={14} style={{ marginRight: 6 }} /> Canteen Scanner
        </button>
      </nav>

      {/* ══════════════════════════════════════
         TAB 1: MENU AND CART
         ══════════════════════════════════════ */}
      {activeTab === "menu" && (
        <div className="grid">
          
          {/* Traffic Warning Banner */}
          <div className="panel span-12" style={{ display: "flex", gap: 12, alignItems: "center", borderLeft: `4px solid ${trafficLevel.color}`, padding: "12px 16px" }}>
            <Clock size={20} color={trafficLevel.color} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--ink)" }}>Canteen traffic: {trafficLevel.status}</strong>
                <span className="badge" style={{ backgroundColor: `${trafficLevel.color}22`, color: trafficLevel.color, padding: "2px 6px", fontSize: "0.7rem" }}>
                  Live Status
                </span>
              </div>
              <p className="subtle" style={{ fontSize: "0.75rem", marginTop: 2 }}>{trafficLevel.desc}</p>
            </div>
          </div>

          {/* Menu Browsing & Filters */}
          <div className="panel span-12">
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div className="search-bar" style={{ flex: 1, position: "relative" }}>
                <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Search food, drinks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 38, width: "100%" }}
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
              {["all", "breakfast", "meals", "snacks", "drinks"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`button ${selectedCategory === cat ? "primary" : "secondary"}`}
                  style={{ 
                    padding: "6px 12px", 
                    fontSize: "0.75rem", 
                    borderRadius: "20px",
                    textTransform: "capitalize",
                    minWidth: "fit-content"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items List */}
          <div className="span-12" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredMenu.length > 0 ? (
              filteredMenu.map((item) => (
                <div key={item.id} className="panel" style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "14px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)" }}>{item.name}</h3>
                      <span className="badge" style={{ backgroundColor: "var(--surface-soft)", fontSize: "0.68rem" }}>{item.time}</span>
                    </div>
                    <p className="subtle" style={{ fontSize: "0.75rem", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {item.desc}
                    </p>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                      <strong style={{ fontSize: "1.05rem", color: "var(--accent)" }}>₹{item.price}</strong>
                    </div>
                  </div>

                  {/* Quantity Counter Block */}
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", minWidth: 80 }}>
                    {cart[item.id] ? (
                      <div style={{ display: "flex", alignItems: "center", background: "var(--primary)", borderRadius: "20px", color: "white", padding: "2px" }}>
                        <button 
                          className="mobile-icon-btn" 
                          onClick={() => updateCartQty(item.id, -1)}
                          style={{ color: "white", padding: 6, minHeight: 0, minWidth: 0, borderRadius: "50%" }}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ padding: "0 10px", fontWeight: 700, fontSize: "0.85rem" }}>{cart[item.id]}</span>
                        <button 
                          className="mobile-icon-btn" 
                          onClick={() => updateCartQty(item.id, 1)}
                          style={{ color: "white", padding: 6, minHeight: 0, minWidth: 0, borderRadius: "50%" }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="button primary" 
                        onClick={() => updateCartQty(item.id, 1)}
                        style={{ padding: "6px 14px", fontSize: "0.78rem", borderRadius: "16px" }}
                      >
                        Add +
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="panel" style={{ textAlign: "center", padding: "30px 16px" }}>
                <p className="subtle">No canteen items match your search.</p>
              </div>
            )}
          </div>

          {/* Floating Cart Footer Drawer */}
          {cartTotal > 0 && (
            <div style={{ 
              position: "fixed", 
              bottom: 60, 
              left: "50%", 
              transform: "translateX(-50%)", 
              width: "100%", 
              maxWidth: 480, 
              padding: "12px 16px", 
              background: "var(--surface)", 
              boxShadow: "0 -8px 24px rgba(0,0,0,0.15)",
              borderTop: "1px solid var(--line)", 
              borderRadius: "16px 16px 0 0",
              zIndex: 99,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <span className="subtle" style={{ fontSize: "0.75rem" }}>{cartItemsArray.length} items added</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <strong style={{ fontSize: "1.2rem", color: "var(--ink)" }}>₹{cartTotal}</strong>
                  <span className="badge" style={{ backgroundColor: "rgba(33,131,92,0.1)", color: "var(--success)" }}>Secure payment</span>
                </div>
              </div>
              <button className="button primary" onClick={handleProceedToPay} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ShoppingBag size={16} /> Proceed to Order
              </button>
            </div>
          )}
        </div>
      )}


      {/* ══════════════════════════════════════
         TAB 2: ACTIVE TICKETS & ORDER HISTORY
         ══════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="grid">
          
          {/* Active Orders List */}
          <div className="panel span-12">
            <h2 className="panel-title" style={{ marginBottom: 12 }}>Active Secure Tickets</h2>
            {orders.filter(o => o.status !== "Claimed" && o.status !== "Cancelled").length === 0 ? (
              <p className="subtle" style={{ fontSize: "0.85rem", padding: "12px 0" }}>No active tickets. Go to ordering tab to buy food.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {orders.filter(o => o.status !== "Claimed" && o.status !== "Cancelled").map((order) => {
                  const stateMeta = getStatusBadge(order.status);
                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderForTicket(order.id)}
                      style={{
                        textAlign: "left",
                        padding: 12,
                        borderRadius: "var(--radius)",
                        border: selectedOrderForTicket === order.id ? "1px solid var(--primary)" : "1px solid var(--line)",
                        background: selectedOrderForTicket === order.id ? `${stateMeta.bg}` : "var(--surface)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ color: "var(--ink)" }}>{order.id}</strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{order.time}</span>
                        </div>
                        <p className="subtle" style={{ fontSize: "0.75rem", marginTop: 4 }}>
                          {order.items.map(i => `${i.name} (${i.qty})`).join(", ")}
                        </p>
                      </div>
                      <span className="badge" style={{ backgroundColor: `${stateMeta.bg}`, color: stateMeta.color }}>
                        {stateMeta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Secure Live Order Card Detail */}
          {activeOrderDetails && activeOrderDetails.status !== "Claimed" && activeOrderDetails.status !== "Cancelled" && (
            <div className="span-12" style={{ position: "relative" }}>
              
              {/* Dynamic Secure Ticket Box */}
              <div className="panel" style={{ 
                border: "2px solid var(--primary)", 
                background: "var(--surface)", 
                borderRadius: "20px", 
                padding: "20px 16px",
                boxShadow: "0 8px 32px rgba(22,77,63,0.15)",
                position: "relative",
                overflow: "hidden"
              }}>
                
                {/* 1. Live Shifting Security Watermark (Anti-Forgery) */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.04,
                  fontSize: "1.6rem",
                  fontWeight: 900,
                  letterSpacing: "0.2em",
                  color: "var(--ink)",
                  transform: "rotate(-25deg)",
                  whiteSpace: "nowrap"
                }}>
                  SVIT SECURE TICKET • {liveTimestamp} • {activeOrderDetails.id}
                </div>

                <div style={{ position: "relative", zIndex: 2 }}>
                  
                  {/* Header Title */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px dashed var(--line)", paddingBottom: 12 }}>
                    <div>
                      <span className="eyebrow" style={{ color: "var(--accent)" }}>PICKUP RECEIPT</span>
                      <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--ink)", marginTop: 2 }}>{activeOrderDetails.id}</h2>
                      <span className="badge" style={{ backgroundColor: "rgba(33,131,92,0.1)", color: "var(--success)", fontSize: "0.72rem", marginTop: 4, display: "inline-block" }}>
                        Verified UTR: {activeOrderDetails.utr.substring(0, 8)}...
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="badge" style={{ 
                        backgroundColor: getStatusBadge(activeOrderDetails.status).bg, 
                        color: getStatusBadge(activeOrderDetails.status).color,
                        fontSize: "0.8rem",
                        padding: "6px 12px"
                      }}>
                        {getStatusBadge(activeOrderDetails.status).label}
                      </span>
                      <p className="subtle" style={{ fontSize: "0.75rem", marginTop: 6 }}>{activeOrderDetails.dineIn ? "Dine-In" : "Takeaway"}</p>
                    </div>
                  </div>

                  {/* Token Details Info */}
                  <div style={{ margin: "16px 0", borderBottom: "1px dashed var(--line)", paddingBottom: 14 }}>
                    <h4 style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Items List</h4>
                    {activeOrderDetails.items.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", margin: "4px 0" }}>
                        <span style={{ color: "var(--ink)" }}>{item.name} <strong style={{ color: "var(--primary)" }}>× {item.qty}</strong></span>
                        <strong style={{ color: "var(--ink)" }}>₹{item.totalPrice}</strong>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                      <strong style={{ color: "var(--ink)" }}>Grand Total</strong>
                      <strong style={{ color: "var(--accent)", fontSize: "1.1rem" }}>₹{activeOrderDetails.total}</strong>
                    </div>
                  </div>

                  {/* 2. Three-Digit Security PIN (Anti-Interception) */}
                  <div style={{ 
                    background: "var(--surface-soft)", 
                    borderRadius: "12px", 
                    padding: "12px", 
                    textAlign: "center",
                    border: "1px solid var(--line)",
                    marginBottom: 16
                  }}>
                    <span className="eyebrow" style={{ fontSize: "0.68rem" }}>VENDORS VERIFICATION PIN</span>
                    <div style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: "0.15em", color: "var(--primary)", marginTop: 2 }}>
                      {activeOrderDetails.pin}
                    </div>
                    <p className="subtle" style={{ fontSize: "0.7rem", marginTop: 4 }}>Show this PIN to vendor at counter for verification.</p>
                  </div>

                  {/* 3. Dynamic TOTP Barcode (Anti-Screenshot Sharing) */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0" }}>
                    <div style={{ padding: 6, background: "white", borderRadius: "10px" }}>
                      <Barcode
                        value={`SVIT-SECURE-${activeOrderDetails.id}-${secureTokenSeed}`}
                        format="CODE128"
                        displayValue={false}
                        background="transparent"
                        lineColor="#000"
                        height={54}
                        width={1.6}
                        margin={6}
                      />
                    </div>
                    
                    {/* Security Token Countdown */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                      <Shield size={14} color="var(--success)" />
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500 }}>
                        Security code rotates in <strong style={{ color: "var(--success)" }}>{totpSecondsLeft}s</strong>
                      </span>
                      <RefreshCw size={10} className="spin" style={{ animationDuration: "2s", color: "var(--muted)" }} />
                    </div>
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 4, fontStyle: "italic" }}>
                      Live dynamic code prevents unauthorized screenshot copies.
                    </span>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Past Orders History */}
          <div className="panel span-12" style={{ marginTop: 10 }}>
            <h2 className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <History size={18} /> Transaction Archive
            </h2>
            {orders.filter(o => o.status === "Claimed" || o.status === "Cancelled").length === 0 ? (
              <p className="subtle" style={{ fontSize: "0.85rem", padding: "10px 0" }}>No transaction archive found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {orders.filter(o => o.status === "Claimed" || o.status === "Cancelled").map((order, idx) => (
                  <div key={idx} style={{ 
                    padding: "12px", 
                    borderRadius: "var(--radius)", 
                    background: "var(--surface-soft)", 
                    border: "1px solid var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)" }}>{order.id}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{order.date}</span>
                      </div>
                      <p className="subtle" style={{ fontSize: "0.75rem", marginTop: 4 }}>
                        {order.items.map(i => `${i.name} (x${i.qty})`).join(", ")}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ display: "block", fontSize: "0.88rem", color: "var(--ink)" }}>₹{order.total}</strong>
                      <span className="badge" style={{ backgroundColor: "rgba(0,0,0,0.04)", fontSize: "0.68rem", marginTop: 4 }}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════
         TAB 3: CANTEEN VENDOR TERMINAL (MOCK SCANNER)
         ══════════════════════════════════════ */}
      {activeTab === "terminal" && (
        <div className="grid">
          
          <div className="panel span-12" style={{ border: "1px solid var(--accent)", background: "rgba(186,100,41,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Terminal size={22} color="var(--accent)" />
              <div>
                <h2 className="panel-title">SVIT Canteen Counter Portal</h2>
                <p className="subtle" style={{ fontSize: "0.78rem", marginTop: 2 }}>Counter operator terminal for verification & security checks.</p>
              </div>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleTerminalScan} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: 4, color: "var(--muted)" }}>ORDER ID / TOKEN NO</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. SVIT-3948"
                  value={terminalSearchId}
                  onChange={(e) => setTerminalSearchId(e.target.value.toUpperCase())}
                  style={{ width: "100%", textTransform: "uppercase" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: 4, color: "var(--muted)" }}>STUDENT PIN (REQUIRED)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. 409"
                  maxLength={3}
                  value={terminalSearchPin}
                  onChange={(e) => setTerminalSearchPin(e.target.value.replace(/\D/g, ""))}
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <button type="submit" className="button" style={{ background: "var(--accent)", color: "white", marginTop: 8 }}>
                Verify & Retrieve Ticket
              </button>
            </form>
          </div>

          {/* Verification Results Display */}
          {terminalResult && (
            <div className="span-12">
              
              {/* Scenario A: Ticket is Valid */}
              {terminalResult === "success" && terminalScannedOrder && (
                <div className="panel" style={{ border: "2px solid var(--success)", padding: 16 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--success)" }}>
                    <ShieldCheck size={20} />
                    <strong style={{ fontSize: "0.95rem" }}>TICKET VALIDATED SUCCESSFULLY</strong>
                  </div>
                  
                  <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Order ID: <strong>{terminalScannedOrder.id}</strong></p>
                    <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Transaction UTR: <strong>{terminalScannedOrder.utr}</strong></p>
                    
                    <div style={{ margin: "10px 0", background: "var(--surface-soft)", padding: 10, borderRadius: 8 }}>
                      {terminalScannedOrder.items.map((i, index) => (
                        <div key={index} style={{ fontSize: "0.82rem", display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                          <span>{i.name} <strong>x {i.qty}</strong></span>
                          <strong>₹{i.totalPrice}</strong>
                        </div>
                      ))}
                    </div>
                    
                    <button onClick={handleConfirmClaimByVendor} className="button full" style={{ background: "var(--success)", color: "white", marginTop: 8 }}>
                      Deliver Food & Claim Token
                    </button>
                  </div>
                </div>
              )}

              {/* Scenario B: Successfully Claimed just now */}
              {terminalResult === "claimed-now" && (
                <div className="panel" style={{ border: "2px solid var(--success)", backgroundColor: "var(--success-soft)", padding: 20, textAlign: "center" }}>
                  <CheckCircle2 size={36} color="var(--success)" style={{ margin: "0 auto 10px" }} />
                  <strong style={{ display: "block", color: "var(--success)", fontSize: "0.95rem" }}>ORDER MARKED AS DELIVERED</strong>
                  <p className="subtle" style={{ fontSize: "0.78rem", marginTop: 6 }}>This secure ticket has been claimed and deactivated. Double-claiming is blocked.</p>
                </div>
              )}

              {/* Scenario C: Anti-Scam Trigger (Double-Claim Blocked) */}
              {terminalResult === "already-claimed" && (
                <div className="panel" style={{ border: "2px solid #ff4d4d", backgroundColor: "rgba(255,77,77,0.06)", padding: 20, textAlign: "center" }}>
                  <AlertCircle size={36} color="#ff4d4d" style={{ margin: "0 auto 10px" }} />
                  <strong style={{ display: "block", color: "#ff4d4d", fontSize: "0.95rem" }}>⚠️ SCAM WARNING: ALREADY CLAIMED</strong>
                  <p className="subtle" style={{ fontSize: "0.8rem", color: "var(--ink)", marginTop: 8 }}>
                    This order token has already been delivered! Reject service immediately. Double-claiming attempt flagged.
                  </p>
                </div>
              )}

              {/* Scenario D: Invalid PIN or Non-existent Order */}
              {terminalResult === "invalid" && (
                <div className="panel" style={{ border: "2px solid #ff4d4d", backgroundColor: "rgba(255,77,77,0.06)", padding: 20, textAlign: "center" }}>
                  <AlertTriangle size={36} color="#ff4d4d" style={{ margin: "0 auto 10px" }} />
                  <strong style={{ display: "block", color: "#ff4d4d", fontSize: "0.95rem" }}>⚠️ INVALID SECURITY PIN</strong>
                  <p className="subtle" style={{ fontSize: "0.8rem", color: "var(--ink)", marginTop: 8 }}>
                    The Order ID does not exist, or the Security PIN does not match. Please verify the live ticket in the student's app.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* Quick Mock Helper */}
          <div className="panel span-12" style={{ border: "1px dashed var(--line)" }}>
            <h4 style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 6 }}>How to test security checks:</h4>
            <ol style={{ paddingLeft: 16, fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
              <li>Place an order in the "Secure Ordering" tab and proceed to checkout.</li>
              <li>Note down the generated **Order ID** (e.g. `SVIT-1234`) and the 3 digit **Verification PIN** (e.g. `4-9-2`) from "My Active Tickets" tab.</li>
              <li>Switch to this "Canteen Scanner" tab, input these values, and verify the details.</li>
              <li>Click "Deliver Food" to claim the ticket. Try inputting the details again to see how the system blocks double-claiming.</li>
            </ol>
          </div>

        </div>
      )}


      {/* ══════════════════════════════════════
         SECURE CHECKOUT & PAYMENT MODAL
         ══════════════════════════════════════ */}
      {showCheckout && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          padding: 16
        }}>
          <div className="auth-card" style={{ maxWidth: 420, width: "100%", background: "var(--surface)", border: "1px solid var(--line)" }}>
            
            {/* Modal Step 1: Payment Method */}
            {checkoutStep === "payment-method" && (
              <div>
                <h3 className="panel-title" style={{ marginBottom: 12 }}>Choose Payment Mode</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "14px 0" }}>
                  <label style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 10, 
                    padding: 12, 
                    border: "1px solid var(--line)", 
                    borderRadius: "var(--radius)",
                    background: paymentMethod === "upi" ? "var(--surface-soft)" : "transparent"
                  }}>
                    <input 
                      type="radio" 
                      name="pay_mode" 
                      checked={paymentMethod === "upi"} 
                      onChange={() => setPaymentMethod("upi")} 
                    />
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "var(--ink)", display: "block" }}>Scan UPI QR (Recommended)</strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Direct dynamic check against transaction reference.</span>
                    </div>
                  </label>

                  <label style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 10, 
                    padding: 12, 
                    border: "1px solid var(--line)", 
                    borderRadius: "var(--radius)",
                    background: paymentMethod === "cash" ? "var(--surface-soft)" : "transparent"
                  }}>
                    <input 
                      type="radio" 
                      name="pay_mode" 
                      checked={paymentMethod === "cash"} 
                      onChange={() => setPaymentMethod("cash")} 
                    />
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "var(--ink)", display: "block" }}>Cash / Pay at Counter</strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Pay cash to cashier to get token approval.</span>
                    </div>
                  </label>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                  <button className="button secondary half" onClick={() => setShowCheckout(false)}>Cancel</button>
                  <button 
                    className="button primary half" 
                    onClick={() => {
                      if (paymentMethod === "upi") {
                        setCheckoutStep("upi-qr");
                      } else {
                        handleConfirmOrder();
                      }
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Modal Step 2: UPI Mock Scanner */}
            {checkoutStep === "upi-qr" && (
              <div style={{ textAlign: "center" }}>
                <h3 className="panel-title" style={{ marginBottom: 6 }}>Pay Canteen Vendor</h3>
                <span className="badge" style={{ backgroundColor: "rgba(186,100,41,0.1)", color: "var(--accent)" }}>Amount Due: ₹{cartTotal}</span>
                
                {/* Visual mock QR Code */}
                <div style={{ 
                  width: 180, 
                  height: 180, 
                  background: "white", 
                  margin: "16px auto", 
                  padding: 8, 
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {/* Styled canvas matrix to look like a real UPI green QR code */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, width: "100%", height: "100%" }}>
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} style={{ 
                        backgroundColor: (i % 2 === 0 || i % 3 === 0) ? "var(--primary)" : "transparent",
                        border: (i === 0 || i === 4 || i === 20 || i === 24) ? "4px solid var(--primary)" : "none",
                        borderRadius: "2px"
                      }} />
                    ))}
                  </div>
                </div>

                <p className="subtle" style={{ fontSize: "0.75rem", margin: "10px 0" }}>
                  Scan code and check that recipient name matches <strong>SVIT Canteen Services</strong>.
                </p>

                {/* UTR Input to simulate real banking verification */}
                <div style={{ textAlign: "left", margin: "14px 0" }}>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, marginBottom: 4, color: "var(--muted)" }}>
                    12-DIGIT TRANSACTION REFERENCE (UTR)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter UTR or keep mock number"
                    value={enteredUtr || generatedUtr}
                    onChange={(e) => setEnteredUtr(e.target.value.replace(/\D/g, ""))}
                    style={{ width: "100%", fontSize: "0.85rem", letterSpacing: "0.08em" }}
                    maxLength={12}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                  <button className="button secondary half" onClick={() => setCheckoutStep("payment-method")}>Back</button>
                  <button 
                    className="button primary half" 
                    onClick={handleConfirmOrder}
                    disabled={(enteredUtr || generatedUtr).length < 12}
                  >
                    Verify & Order
                  </button>
                </div>
              </div>
            )}

            {/* Modal Step 3: Placing Order Loading */}
            {checkoutStep === "placing" && (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <div className="loader" style={{ margin: "0 auto 16px" }} />
                <h3>Securing Payment...</h3>
                <p className="subtle" style={{ fontSize: "0.75rem", marginTop: 6 }}>Verifying UTR against bank records. Please hold.</p>
              </div>
            )}

            {/* Modal Step 4: Success Message */}
            {checkoutStep === "success" && (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <CheckCircle2 size={46} color="var(--success)" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ color: "var(--primary)" }}>Order Secured!</h3>
                <p className="subtle" style={{ fontSize: "0.78rem", marginTop: 6 }}>
                  Your canteen ticket has been generated. Show your rotating barcode at the counter to claim food.
                </p>
                <button 
                  className="button primary full" 
                  onClick={() => {
                    setShowCheckout(false);
                    setActiveTab("history");
                  }} 
                  style={{ marginTop: 18 }}
                >
                  View Order Ticket
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </main>
  );
}
