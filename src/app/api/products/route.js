import { localDate } from "@/lib/dateTime";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// get all products
export async function GET(req, res) {
  try {
    const products = await prisma.products.findMany({
      where:{
        stock:true
      }
    });

    
    return NextResponse.json({ status: "ok", data: products });
  } catch (error) {
    console.log(error.message)
    return NextResponse.json({
      status: 500,
      error: "Failed to fetch products data",
    });
  }
}



// product add 
export async function POST(req, res) {
  const { name, category,subCategory, perPackte, totalpackte, quantity, unitPrice, note } = await req.json();

  try {
    const product = await prisma.products.create({
      data: {
        name: name,
        category: category || null,
        subCategory: subCategory || null,
        perPacket: perPackte ? parseFloat(perPackte) : null,// Corrected from `perPackte` to `perPacket`
        totalpacket: totalpackte ? parseFloat(totalpackte) : null, 
        quantity: parseInt(quantity),
        unitPrice: parseInt(unitPrice) || 0,
        note: note || "null",
        stock: true,
        created_at: localDate(),
        history: {
          create: {
            name: name,
            category: category || null,
            subCategory: subCategory || null,
            totalpacket: totalpackte ? parseFloat(totalpackte) : null, 
            quantity:parseInt(quantity),
            created_at:localDate(),
            // updated_at:new Date(),
            // unitPrice: unitPrice ? parseInt(unitPrice) : 0,
          },
        },
      },
    });
    console.log(product)
    return NextResponse.json({ status: "ok", data: product });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json({ status: 500, error: "Failed to add product!" });
  }
}


// exsit product Update 
export async function PUT(req, res) {
  try {
      const obj = await req.json();

      const { id, name, category, subCategory, perPackte, totalpackte, quantity, unitPrice, note } = obj;

      const existingProduct = await prisma.products.findUnique({
          where: { id },
      });
      
      const updatedProduct = await prisma.products.update({
          where: { id },
          data: {
              totalpacket: parseFloat(existingProduct.totalpacket) + (parseFloat(totalpackte) || 0),
              quantity: parseInt(existingProduct.quantity) + (parseInt(quantity) || 0),
              perPacket: parseFloat(perPackte) || parseFloat(existingProduct.perPacket),
              unitPrice: parseFloat(unitPrice) || existingProduct.unitPrice,
              stock: true,
              note: note || existingProduct.note,
              history: {
                create:{
                  name: name,
                  category: category,
                  subCategory:subCategory || null,
                  totalpacket: parseFloat(totalpackte),
                  quantity:parseInt(quantity),
                  unitPrice: unitPrice ? parseInt(unitPrice) : null
                }
              },
          },
      });
      

      return NextResponse.json({ status: "ok", data: updatedProduct });
  } catch (error) {
      // console.error("Error updating product:", error); // Log the error
      console.log(error.message)
      return NextResponse.json(
          { status: "error", message: "Internal server error", details: error.message },
          { status: 500 }
      );
  }
}



// fetch suggestion product
export async function PATCH(req, res) {
  
  try {
    const reqUrl = new URL(req.url);
    const category= reqUrl.searchParams.get('category');
    const subCategory= reqUrl.searchParams.get('subCategory');
    const productName= reqUrl.searchParams.get('name');
  

    if(category === 'FEED'){
      const suggestions = await prisma.products.findMany({
        where: {
            category: category,
            subCategory:subCategory,
            name: {
                contains: productName, // Case-insensitive partial match
                // mode: 'insensitive',
            },
        },
        select: {
            id: true,
            name: true,
            category: true,
            subCategory: true,
            perPacket: true,
            totalpacket: true,
            quantity: true,
            unitPrice: true,
            note: true,
        },
    });
    return NextResponse.json({ status: "ok", data: suggestions });
    } else {
      const suggestions = await prisma.products.findMany({
        where: {
            category: category,
            name: {
                contains: productName, // Case-insensitive partial match
                // mode: 'insensitive',
            },
        },
        select: {
            id: true,
            name: true,
            category: true,
            subCategory: true,
            perPacket: true,
            totalpacket: true,
            quantity: true,
            unitPrice: true,
            note: true,
        },
    });
    return NextResponse.json({ status: "ok", data: suggestions });
    }

  } catch (error) {
    console.log(error.message);
    return NextResponse.json({ status: 500, error: "Failed to add product!" });
  }
}
