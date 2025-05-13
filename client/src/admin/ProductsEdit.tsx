import React, { SyntheticEvent, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Wrapper from "./Wrapper";
import { Product } from "../interfaces/product";

const ProductsEdit = () => {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    (async () => {
      const response = await fetch(`http://localhost:8000/api/products/${id}`);
      const product: Product = await response.json();
      setTitle(product.title);
      setImage(product.image);
    })();
  }, [id]);

  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();

    await fetch(`http://localhost:8000/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, image }),
    });

    navigate("/admin/products");
  };

  return (
    <Wrapper>
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Title</label>
          <input
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Image</label>
          <input
            className="form-control"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
        </div>
        <button className="btn btn-outline-secondary">Save</button>
      </form>
    </Wrapper>
  );
};

export default ProductsEdit;
