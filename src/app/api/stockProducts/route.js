import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"


const prisma = new PrismaClient()

export const GET = async (req) => {
    // const {searchParams} = new URL(req.url)
    // const category = searchParams.get("category");
    
    try {
        // if(!category) {
        //     console.log("Category not Found !")
        //     return NextResponse.json({status: 404,error: "Category not Found !"})
        // }

        const productsByCategory = await prisma.products.findMany({
            where: {
                // category: category
                stock:true
            },
            select:{
                id: true,
                name:true,
                category:true,
                subCategory: true,
                perPacket:true,
                totalpacket:true,
                unitPrice:true,
                quantity:true,
            }
        })

        return NextResponse.json({status: 'ok',data:{productsByCategory}})
    } catch (error) {
        return NextResponse.json({status: '400',error:error.message})
    }
}