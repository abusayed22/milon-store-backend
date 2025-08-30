import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"


const prisma = new PrismaClient()

export const GET = async (req) => {
    
    try {

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
        // console.log(productsByCategory)
        return NextResponse.json({status: 'ok',data:{productsByCategory}})
    } catch (error) {
        return NextResponse.json({status: '400',error:error.message})
    }
}