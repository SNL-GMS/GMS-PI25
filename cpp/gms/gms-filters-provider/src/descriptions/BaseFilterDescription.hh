#ifndef BASE_FILTER_DESCRIPTION_H
#define BASE_FILTER_DESCRIPTION_H
#include <string>
#include "../enums.hh"

class BaseFilterDescription
{
public:
    BaseFilterDescription(bool causal, std::string comments);
    virtual ~BaseFilterDescription() = default;
    bool causal;
    std::string comments;

    virtual FILTER_DESCRIPTION_TYPE getFilterDescriptionType() const
    {
        return FILTER_DESCRIPTION_TYPE::BASE_FILTER_DESCRIPTION;
    };
};

#endif