import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Product } from "../interfaces/product";

const Main = () => {
  const [products, setProducts] = useState([] as Product[]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("http://localhost:8001/api/products");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const like = async (id: number) => {
    await fetch(`http://localhost:8001/api/products/${id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    setProducts(
      products.map((p: Product) => {
        if (p.id === id) {
          p.likes++;
        }
        return p;
      })
    );
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <span className="navbar-brand">My Store</span>
          <Link
            to="/admin/products/create"
            className="btn btn-outline-light ms-auto"
          >
            Create Product
          </Link>
        </div>
      </nav>

      <main role="main">
        <div className="album py-5 bg-light">
          <div className="container">
            <div className="row">
              {loading ? (
                <div className="col-12 text-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="col-12 text-center">
                  <h4>No products available. Please add some products!</h4>
                </div>
              ) : (
                products.map((p: Product) => (
                  <div className="col-md-4" key={p.id}>
                    <div className="card mb-4 shadow-sm">
                      <img alt="product" src={p.image} height="180" />
                      <div className="card-body text-center">
                        <h5 className="card-title">{p.title}</h5>
                        <div className="d-flex justify-content-between align-items-center mt-3">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => like(p.id)}
                          >
                            ❤️ Like
                          </button>
                          <small className="text-muted">{p.likes} likes</small>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Main;
